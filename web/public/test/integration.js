describe("Get Projects integration test", function () {
    //This will fail unless private_token and gitlab are set in the testing url
    //will request to see 2 projects at a time and loop through till no more data is returned.
    var projects = [];
    //jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    var qs = window.location.search;
    var gitLabPrivateApiToken = getQsParam(qs, "private_token");
    var gitLabServer = getQsParam(qs, 'gitlab');
    var projParams = getBaseGitLabUrlParams(gitLabPrivateApiToken, 1, 2);//start with first page
    var projUrl = getProjectUrl(gitLabServer);

    beforeEach(function (done) {

        var callBack = function (data) {
            projects = data;
            done(); //this can be omitted in production
        };
        var data1 = new Array();
        //get projects and call done when finished
        getDataRecursively(projUrl, projParams, callBack, data1);
    });

    it('should return all projects', function () {
        expect(projects.length).toBeGreaterThan(5);//assuming you have more than 5 projects in your real gitlab
    });
});


describe("Get Merge Requests integration test", function () {
    //This will fail unless private_token and gitlab are set in the testing url
    //will request to see 2 projects at a time and loop through till no more data is returned.
    var projects = [],
        mergeRequests = new Array();
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
    var qs = window.location.search;
    var gitLabPrivateApiToken = getQsParam(qs, "private_token");
    var gitLabServer = getQsParam(qs, 'gitlab');
    var projParams = getBaseGitLabUrlParams(gitLabPrivateApiToken, 1, 2);//start with first page
    var projUrl = getProjectUrl(gitLabServer);
    var mergeReqParams = getMergeReqParams(gitLabPrivateApiToken, 1, 3);
    var mergeReqUrl;
    var requests = new Array();
    beforeEach(function (done) {

        var mergeReqCompleteCallback = function (data,bag1) {
            if (data && data.length > 0) {
                appendToOrig(mergeRequests, data);
            }
            for (var j = 0; j < bag1.requests.length; j++) {
                for (var i = 0; i < requests.length; i++) {
                    var reqUrl  = requests[i].url;
                    var bagUrl = bag1.requests[j].url;
                    if (reqUrl == bagUrl) {
                        requests.splice(i, 1);
                        break;
                    }
                }
              
            }
            if (requests.length == 0) {
                done();
            }
        };

        var afterProjects = function () {
            for (var i = 0; i < projects.length; i++) {
                var tempBag = {};
                tempBag.requests = new Array();
                mergeReqUrl = getMergeRequestUrl(gitLabServer, projects[i].id);
                var req = {};
                req.url = mergeReqUrl;
                req.params = mergeReqParams;
                requests.push(req);
                getDataRecursively(mergeReqUrl, mergeReqParams, mergeReqCompleteCallback, new Array(),tempBag);
            }
        };

        var callBack = function (data) {
            projects = data;
            afterProjects();
        };
        var dataProj = new Array();
        //get projects and call done when finished
        getDataRecursively(projUrl, projParams, callBack, dataProj);
    });

    it('should return more than one merge requests, assuming there are merge requests.', function () {
        expect(mergeRequests.length).toBeGreaterThan(1);
    });
});