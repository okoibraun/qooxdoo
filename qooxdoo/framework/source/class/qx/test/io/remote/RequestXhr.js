/* ************************************************************************

qooxdoo - the new era of web development

http://qooxdoo.org

Copyright:
  2007-2008 1&1 Internet AG, Germany, http://www.1und1.de

License:
  LGPL: http://www.gnu.org/licenses/lgpl.html
  EPL: http://www.eclipse.org/org/documents/epl-v10.php
  See the LICENSE file in the project's top-level directory for details.

Authors:
  * Fabian Jakobs (fjakobs)

************************************************************************ */

/*
#asset(qx/test/*)
*/

qx.Class.define("qx.test.io.remote.RequestXhr",
{
  extend : qx.test.io.remote.AbstractRequest,

  members :
  {
    // Overridden
    _createRequest : function() {
      var url = this.getUrl("qx/test/xmlhttp/echo_get_request.php");
      return new qx.io.remote.Request(url, "GET", "text/plain");
    },


    testSynchronous : function()
    {
      if (this.isLocal()) {
        this.needsPHPWarning();
        return;
      }

      if (this.buggyBrowser) {
        this.warn("Tests skipped in Safari 3/FF 1.5, see bug #2529");
        return;
      }

      var completedCount = 0;

      for (var i = 0; i < this.__requests.length; i++)
      {
        var request = this.__requests[i];

        request.setAsynchronous(false);
        request.setParameter("test", "test" + i);

        request.addListener("completed", function(e)
        {
          completedCount++;

          var response = qx.lang.Json.parse(e.getContent());
          request = e.getTarget();
          this.assertEquals(request.getParameter("test"), response["test"]);
        }, this);

        request.send();
      }

      this.assertEquals(i, completedCount, "Test doesn't run synchronous!");
    },


    testSynchronousAndAsynchronousMix : function()
    {
      if (this.isLocal()) {
        this.needsPHPWarning();
        return;
      }

      if (this.buggyBrowser) {
        this.warn("Tests skipped in Safari 3/FF 1.5, see bug #2529");
        return;
      }

      var asynchronousRequest = this.__requests[0];
      var synchronousRequest = this.__requests[1];

      asynchronousRequest.setParameter("test", "asynchronousRequest");
      asynchronousRequest.setParameter("sleep", 1);
      synchronousRequest.setParameter("test", "synchronousRequest");
      synchronousRequest.setAsynchronous(false);

      var asynchronousRequestFinished = false;
      var synchronousRequestFinished = false;

      asynchronousRequest.addListener("completed", function(e)
      {
        //this.resume(function()
        //{
          asynchronousRequestFinished = true;

          var response = qx.lang.Json.parse(e.getContent());
          var request = e.getTarget();
          this.assertEquals(request.getParameter("test"), response["test"]);
        //}, this);
      }, this);

      synchronousRequest.addListener("completed", function(e)
      {
        synchronousRequestFinished = true;

        var response = qx.lang.Json.parse(e.getContent());
        var request = e.getTarget();
        this.assertEquals(request.getParameter("test"), response["test"]);
      }, this);

      asynchronousRequest.send();
      synchronousRequest.send();

      var that = this;
      this.wait(5000, function()
      {
        that.assertTrue(asynchronousRequestFinished);
        that.assertTrue(synchronousRequestFinished);
      });
    }
  }
});