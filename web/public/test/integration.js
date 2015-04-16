var gn = glNext();
describe("Get Projects integration test", function () {
    //This will fail unless private_token and gitlab are set in the testing url
    //will request to see 2 projects at a time and loop through till no more data is returned.
    var projects = [];
    //jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    var qs = window.location.search;
    var gitLabPrivateApiToken = gn.getQsParam(qs, "private_token");
    var gitLabServer = gn.getQsParam(qs, 'gitlab');
    var projParams = gn.getBaseGitLabUrlParams(gitLabPrivateApiToken, 1, 2);//start with first page
    var projUrl = gn.getProjectUrl(gitLabServer);

    beforeEach(function (done) {

        var callBack = function (data) {
            projects = data;
            done(); //this can be omitted in production
        };
        var data1 = [];
        //get projects and call done when finished
        gn.getDataRecursively(projUrl, projParams, callBack, data1);
    });

    it('should return all projects', function () {
        expect(projects.length).toBeGreaterThan(5);//assuming you have more than 5 projects in your real gitlab
    });
});


describe("Get all Merge Requests for all projects integration test", function () {
    //This will fail unless private_token and gitlab are set in the testing url
    //will request to see 2 projects at a time and loop through till no more data is returned.
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000; //might need to adjust timeout based on integration test environment
    var allMergeRequests = [], //all merge requests when done
        initialMergeRequestCalls = [];//place to hold the original merge request with the first page number, basically creates a distinct list to later compare all merge requests against to know when we are done.
    
    var qs = window.location.search;
    var gitLabPrivateApiToken = gn.getQsParam(qs, "private_token");
    var gitLabServer = gn.getQsParam(qs, 'gitlab');

    beforeEach(function (done) {
        /*
         * @summary adds each request to the bag for each paginated call.  The page number and project number will be the primary difference between many of the entries
         */
        var preGetHook = function (url1, params1, data1, bag1) {
            gn.addRequestToBag(url1, params1, bag1);
        };
        
        /*
         * @summary this will be called once for each project
        */
        var mergeReqCompleteCallback = function (data,bag1) {
            if (data && data.length > 0) {
                gn.appendToOrig(allMergeRequests, data);
            }
            for (var j = 0; j < bag1.requests.length; j++) {
                for (var i = 0; i < initialMergeRequestCalls.length; i++) {
                    var reqUrl  = initialMergeRequestCalls[i].url;
                    var bagUrl = bag1.requests[j].url;
                    if (reqUrl === bagUrl) {
                        initialMergeRequestCalls.splice(i, 1);
                        break;
                    }
                }
            }
            if (initialMergeRequestCalls.length === 0) {
                done();
            }
        };

        var storeRequestForLater = function(url, params) {
            var req = {};
            req.url = url;
            req.params = params;
            initialMergeRequestCalls.push(req);
        };
        /*
         * @summary after we get all projects we need to loop through each project and get the merge requests associated with the project.
         */
        var afterProjects = function (projectsCalled) {
            for (var i = 0; i < projectsCalled.length; i++) {
                var mrBag = {}; // bag to hold merge request stuff
                mrBag.requests = []; //we need a list of all the requests made so we can later ensure we have all the data before saying we are done. 
                var mergeReqParams = gn.getMergeReqParams(gitLabPrivateApiToken, 1, 3); //start with first page and return 3 items per request
                var mergeReqUrl = gn.getMergeRequestUrl(gitLabServer, projectsCalled[i].id);
                storeRequestForLater(mergeReqUrl, mergeReqParams);
                gn.getDataRecursively(mergeReqUrl, mergeReqParams, mergeReqCompleteCallback, [], mrBag, preGetHook);
            }
        };
        
        /*
         * @summary we need to get all projects before we can get all merge requests.
         */
        var getAllProjects = function() {
            var callBack = function(data) {
                afterProjects(data);
            };
            var projParams = gn.getBaseGitLabUrlParams(gitLabPrivateApiToken, 1, 2);//start with first page and return 2 projects per request
            var projUrl = gn.getProjectUrl(gitLabServer);
            var dataProj = [];
            //get projects and call done when finished
            gn.getDataRecursively(projUrl, projParams, callBack, dataProj);
        };
        getAllProjects();
    });

    it('should return more than one merge requests, assuming there are merge requests.', function () {
        expect(allMergeRequests.length).toBeGreaterThan(1);
    });
});