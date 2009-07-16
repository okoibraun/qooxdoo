#!/usr/bin/env python
# -*- coding: utf-8 -*-
################################################################################
#
#  qooxdoo - the new era of web development
#
#  http://qooxdoo.org
#
#  Copyright:
#    2006-2009 1&1 Internet AG, Germany, http://www.1und1.de
#
#  License:
#    LGPL: http://www.gnu.org/licenses/lgpl.html
#    EPL: http://www.eclipse.org/org/documents/epl-v10.php
#    See the LICENSE file in the project's top-level directory for details.
#
#  Authors:
#    * Sebastian Werner (wpbasti)
#
################################################################################

import os, sys, time
import cPickle as pickle
from misc import filetool
from misc.securehash import sha_construct

memcache = {}

class Cache:
    def __init__(self, path, console):
        self._path = path
        self._check_path(self._path)
        self._lock_file, attempted_file = self.lock()
        if not self._lock_file:
            raise RuntimeError, "The cache is currently in use by another process (%r)" % attempted_file
        self._closed  = False
        self._console = console

    def __del__(self):
        if getattr(self, '_closed', None) and not self._closed:
            self.unlock()

    def close(self):
        self.unlock()
        self._closed = True

    def _check_path(self, path):
        if not os.path.exists(path):
            filetool.directory(path)
        elif not os.path.isdir(path):
            raise RuntimeError, "The cache path is not a directory: %s" % path
        else: # it's an existing directory
            # defer read/write access to the first call of read()/write()
            pass

    def unlock(self):
        path = getattr(self, "_lock_file", None)
        if path and os.path.exists(path):
            #print "xxx releasing cache lock"
            os.unlink(path)

    def lock(self):
        #print "xxx creating cache lock"
        path = self._path
        lockfile = os.path.join(path, "cache.lock")
        successfile = None
        try:
            fd = os.open(lockfile, os.O_CREAT|os.O_EXCL|os.O_RDWR)
        except:
            return successfile, lockfile
        if fd:
            os.close(fd)
            successfile = lockfile

        return successfile, lockfile

    def filename(self, cacheId):
        cacheId = cacheId.encode('utf-8')
        splittedId = cacheId.split("-")
        
        if len(splittedId) == 1:
            return cacheId
                
        baseId = splittedId.pop(0)
        digestId = sha_construct("-".join(splittedId)).hexdigest()

        return "%s-%s" % (baseId, digestId)
        
        
    def readmulti(self, cacheId, dependsOn=None):
        splittedId = cacheId.split("-")
        baseId = splittedId.pop(0)
        contentId = "-".join(splittedId)
        multiId = "multi" + baseId
        
        saved = self.read(multiId, None, True)
        if saved and saved.has_key(contentId):
            temp = saved[contentId]
            
            if os.stat(dependsOn).st_mtime > temp["time"]:
                return None
            
            return temp["content"]
            
        return None
        
        
    def writemulti(self, cacheId, content):
        splittedId = cacheId.split("-")
        baseId = splittedId.pop(0)
        contentId = "-".join(splittedId)
        multiId = "multi" + baseId

        saved = self.read(multiId, None, True)
        if not saved:
            saved = {}
        
        saved[contentId] = {"time":time.time(), "content":content}
        self.write(multiId, saved, True)


    ##
    # Read an object from cache.
    # 
    # @param dependsOn  file name to compare cache file against
    # @param memory     if read from disk keep value also in memory; improves subsequent access
    def read(self, cacheId, dependsOn=None, memory=False):
        if memcache.has_key(cacheId):
            return memcache[cacheId]

        filetool.directory(self._path)
        cacheFile = os.path.join(self._path, self.filename(cacheId))

        try:
            cacheModTime = os.stat(cacheFile).st_mtime
        except OSError:
            return None

        # Out of date check
        if dependsOn:
            fileModTime = os.stat(dependsOn).st_mtime
            if fileModTime > cacheModTime:
                return None

        try:
            filetool.lock(cacheFile)
            fobj = open(cacheFile, 'rb')
            #filetool.lock(fobj.fileno())

            content = pickle.load(fobj)

            #filetool.unlock(fobj.fileno())
            fobj.close()
            filetool.unlock(cacheFile)

            if memory:
                memcache[cacheId] = content

            return content

        except (IOError, EOFError, pickle.PickleError, pickle.UnpicklingError):
            self._console.error("Could not read cache from %s" % self._path)
            return None


    ##
    # Write an object to cache.
    #
    # @param memory         keep value also in memory; improves subsequent access
    # @param writeToFile    write value to disk
    def write(self, cacheId, content, memory=False, writeToFile=True):
        filetool.directory(self._path)
        cacheFile = os.path.join(self._path, self.filename(cacheId))

        if writeToFile:
            try:
                #filetool.lock(fobj.fileno(), write=True)
                filetool.lock(cacheFile)
                fobj = open(cacheFile, 'wb')

                pickle.dump(content, fobj, 2)

                #filetool.unlock(fobj.fileno())
                fobj.close()
                filetool.unlock(cacheFile)

            except (IOError, EOFError, pickle.PickleError, pickle.PicklingError):
                self._console.error("Could not store cache to %s" % self._path)
                sys.exit(1)

        if memory:
            memcache[cacheId] = content
