var gn = glNext();
describe('How to run tests with real dependencies', function () {
  
    var qs = window.location.search;
    var gitLabPrivateApiToken = gn.getQsParam(qs, "private_token");
    var gitLabServer = gn.getQsParam(qs, 'gitlab');

    //example: http://localhost:3000/test/unit.html?private_token=abcdefghijklmn
    it('should get the private gitlab api token from url in tests so it is not checked into the source code', function () {
        expect(gitLabPrivateApiToken.length).toBeGreaterThan(2);
    });

    //example: http://localhost:3000/test/unit.html?private_token=abcdefghijklmn&gitlab=https://gitlab.example.com
    it('should get the gitlab server name from the url in tests', function () {
        expect(gitLabServer.length).toBeGreaterThan(2);
    });

});

describe('Gitlab Projects', function () {

    describe('Getting all projects', function () {
        it('should build a url to get all projects ', function () {
            var glToken = "abcdefghijklmn",
                glUrl = "https://gitlab.example.com";
            var projParams = gn.getBaseGitLabUrlParams(glToken, 1, 100);
            var projUrl = gn.getProjectUrl(glUrl) + '?' + $.param(projParams);
            expect(projUrl).toEqual('https://gitlab.example.com/api/v3/projects?per_page=100&private_token=abcdefghijklmn&page=1');
        });
    });

    describe('Using mocked jQuery to get project data ', function () {
        var server,
            fakeData1 = [{ id: 1, name: "Project1" }, { id: 2, name: "Project2" }],
            fakeData2 = [{ id: 1, name: "Project3" }, { id: 2, name: "Project4" }],
            gitLabPrivateApiToken = "abcdefghijkl",
            gitLabServer = "https://gitlab.example.com";

        var projParams =gn.getBaseGitLabUrlParams(gitLabPrivateApiToken, 1, 2);
        var projUrl = gn.getProjectUrl(gitLabServer);

        beforeEach(function () {
            server = sinon.fakeServer.create();
            //needed for the get first page test
            server.respondWith("GET", projUrl + '?' + $.param(projParams),
                [
                    200,
                    {
                        "Content-Type": "application/json",
                        "Link": "<" + gitLabServer + '/api/v3/projects?page=2&per_page=2>; rel="next", <'
                                    + gitLabServer + '/api/v3/projects?page=1&per_page=2>; rel="first", <'
                                    + gitLabServer + '/api/v3/projects?page=2&per_page=2>; rel="last"'
                    },
                    JSON.stringify(fakeData1)
                ]);
            //needed for the get second page test with no more next pages
            server.respondWith("GET", projUrl + '?' + $.param(gn.getBaseGitLabUrlParams(gitLabPrivateApiToken, 2, 2)),
               [
                   200,
                   {
                       "Content-Type": "application/json",
                       "Link": "<"
                                   //+ gitLabServer + '/api/v3/projects?page=1&per_page=2>; rel="next", <'
                                   + gitLabServer + '/api/v3/projects?page=1&per_page=2>; rel="first", <'
                                   + gitLabServer + '/api/v3/projects?page=2&per_page=2>; rel="last"'
                   },
                   JSON.stringify(fakeData2)
               ]);
        });

        afterEach(function () {
            server.restore();
        });

        it('should get project data using $.get', function (done) {
            $.get(projUrl, projParams).done(function (data) {
                expect(data.length).toBe(2);
                done();
            });
            server.respond();
        });
    });
});

describe('appendToOrig', function () {
    it('should add new data to the list of old data', function () {
        var orig = new Array({ 'foo': 'bar' });
        var newData = new Array({ 'foo': 'bar1' });
        gn.appendToOrig(orig, newData);
        expect(orig[1].foo).toBe('bar1');
    });
});

describe('makeNextCall', function () {
    var implementation,
        newData,
        data,
        url,
        params,
        completedSpy;
    beforeEach(function () {
        newData = [{ 'foo': 'bar' }, { 'foo': 'bar1' }],
        data = new Array(),
        url = 'https://gitlab.example.com';
        params = gn.getMergeReqParams("abc", 1, 2);
        completedSpy = sinon.spy();

        implementation = function (url1, params1, completedCallback1, data1, bag1) {
            var newData1 = new Array();
            if (data1.length < 3) {
                newData1.push({ 'foo': 'bar3' });
                newData1.push({ 'foo': 'bar4' });
            }
            bag1.count++;
            gn.makeNextCall(newData1, data1, url1, params1, completedCallback1, implementation,bag1 );
        };
    });

    var getNumberOfTimesImplWasCalled = function () {
        //works because params is an object so it is passed by ref
        //makeNextCall increments the page number if the last call had newData
        //we always start with page 1 so we have to back that out.
        return params.page - 1;
    };

    it('should increment the pageNumber if newData has new data', function () {
        var bag = {};
        bag.requests = new Array();
        gn.makeNextCall(newData, data, url, params, completedSpy, implementation, bag);
        expect(params.page).toEqual(3);
    });

    it('should keep appending data untill no more data is returned from the goGetter and then invoke completedCallback.', function () {
        var bag = {};
        bag.requests = new Array();
        gn.makeNextCall(newData, data, url, params, completedSpy, implementation, bag);
        expect(data.length).toBeGreaterThan(3);
        expect(getNumberOfTimesImplWasCalled()).toEqual(2);
        sinon.assert.calledOnce(completedSpy);
    });
    
    it('completedCallback should return bag with user defined data from http request.', function () {
        var bag = {};
        bag.count = 0;
        var completed = function(data1,bag1) {
            bag1.count++;
        };

        gn.makeNextCall(newData, data, url, params, completed, implementation, bag);
        expect(bag.count).toEqual(3);
    });
    
});

describe('Gitlab Merge Request API', function () {

    it('should return url for merge request minus the query string', function () {
        var expectedUrl = "https://gitlab.example.com:8088/api/v3/projects/29/merge_requests",
            projectId = 29,
            host = 'https://gitlab.example.com:8088';

        var actualUrl = gn.getMergeRequestUrl(host, projectId);
        expect(actualUrl).toBe(expectedUrl);
    });

    it('should return params needed for merge request api call', function () {
        //after we run the object through the params in jquery we should have the following:  state=all&page=2&per_page=100&private_token=abc"
        var token = 'abc',
             page = 1,
             perPage = 100;

        var p = gn.getMergeReqParams(token, page, perPage);

        expect(p['private_token']).toBe('abc');
        expect(p['page']).toBe(1);
        expect(p['per_page']).toBe(100);
        expect(p['state']).toBe('all');
    });
});

describe("addRequestsToBag", function() {
    it('should do nothing is bag is undefined or null', function() {

    });

    it('should do nothing if bag is defined bur requests is not defined.', function() {

    });
    it('should add a request with the current url and params', function() {

    });
});

describe("getDataRecursively", function() {
    var server,
        url = "https://gitlab.example.com",
        params = { page: 1 },
        params2 = {page:2},
        data = new Array(),
        bag = {
            page: 1,
            requests: new Array()
        };
    
    beforeEach(function () {
        server = sinon.fakeServer.create();
        server.autoRespond = true;
        //first call with data
        server.respondWith("GET", url + '?' + $.param(params),
            [
                200,
                {"Content-Type": "application/json"},
                JSON.stringify([{id:1},{id:2}])
            ]);
        //advance page and this call does not return any data.
        server.respondWith("GET", url + '?' + $.param(params2),
           [
               200,
               { "Content-Type": "application/json" },
               JSON.stringify([])
           ]);
    });

    afterEach(function () {
        server.restore();
    });
    
    it('should call a function to add the current http request to the bag', function (done) {
        var completed = function (data1, bag1) {
            expect(bag1.requests.length).toEqual(2);
            done();
        };

        var preGetHook = function (url1, params1, data1, bag1) {
            gn.addRequestToBag(url1, params1, bag1);
        };
        gn.getDataRecursively(url, params, completed, data, bag, preGetHook) ;
        server.respond();
    });

    it('should call $.get which should call the callback function', function() {
        var completed = function (data1, bag1) {
            console.log(data1);
            console.log(bag1);
            done();
        };
        var callback = sinon.spy(completed);
        gn.getDataRecursively(url, params, callback, data, bag);
        server.respond();
        sinon.assert.calledOnce(callback);
    });

});

describe("getAllMergeRequestsForAllProjects", function () {
    var stubArgs, gamr, gnMock,
        completeCallBackStub;

    var stubImpl = function (url, params, callback, data) {
        stubArgs = {
            url: url,
            params: params,
            callback: callback,
            data: data
        };
        callback(data);//we only need to invoke the callback
    };
    
    beforeEach(function () {
        completeCallBackStub = sinon.stub();
        var g = glNext();
        gnMock = sinon.mock(g);
        gamr = getAllMergeRequestsForAllProjects(completeCallBackStub, stubImpl, "private_token=abcdefg&gitlab=https://gitlab.example.com",gnMock.object);
    });

    afterEach(function () {
        gnMock.restore();
    });

    describe("getAllProjects", function () {
        
        it('should have a function getAllProjects', function () {
            expect(gamr.getAllProjects).toBeDefined();
        });
    
        /* @param {function} done is part of Jasmine */
        it('should call callbacks with data', function (done) {
            var completed = function (data) {
                expect(data).toBeDefined();
                done();// tell jasmine we are finished.
            };
            gamr.getAllProjects(completed);
        });
        
        it('should get 100 items per call', function (done) {
            var completed = function () {
                expect(stubArgs.params.per_page).toEqual(100);
                done();// tell jasmine we are finished.
            };
            gamr.getAllProjects(completed);
        });
    });

    describe('getMergeRequestForEachProject', function () {
        var any = sinon.match.any;
        var emptyArray = sinon.match(function (value) {
            if (value.length == 0) {
                return true;
            }
            return false;
        }, 'emptyArray');


        var projects = new Array();
        //make array with 5 items
        for (var i = 0; i < 5; i++) {
            var project1 = {id:i};
            projects.push(project1);
        }

        it('should make a call for each project in array', function() {
            gnMock.expects('getDataRecursively').exactly(5);
            gamr.getMergeRequestsForEachProject(projects);
            gnMock.verify();
        });
        
        it('store very first call in array for later comparison of done', function () {
            gamr.getMergeRequestsForEachProject(projects);
            expect(gamr.getInitialMergeRequestCalls().length).toEqual(5);
        });
        it('should start with an empty array for each call', function() {
            gnMock.expects('getDataRecursively').exactly(5).withArgs(any,any,any,emptyArray,any,any);
            gamr.getMergeRequestsForEachProject(projects);
            gnMock.verify();
        });
        it('bag should be initialized with requests initialized as new array ', function () {
            var hasEmptyRequestArray = sinon.match(function (value) {
                if (value.requests.length == 0) {
                    return true;
                }
                return false;
            }, 'has empty Requests array');
            gnMock.expects('getDataRecursively').exactly(5).withArgs(any, any, any, any, hasEmptyRequestArray, any);
            gamr.getMergeRequestsForEachProject(projects);
            gnMock.verify();
        });
        it('bag should get 100 items per request ', function () {
            var validate = sinon.match(function (value) {
                if (value.per_page == 100) {
                    return true;
                }
                return false;
            }, 'per_page is not 100');
            
            gnMock.expects('getDataRecursively').exactly(5).withArgs(any, validate, any, any, any, any);
            gamr.getMergeRequestsForEachProject(projects);
            gnMock.verify();
        });
        it('url should have project id ', function () {
            var validate = sinon.match(function (value) {
                var match = false;
                for (var j = 0; j < 5; j++) {
                    if(value == j) {
                        match = true;
                        break;
                    }
                }
                return match;
            }, 'project id not found');
            gnMock.expects('getMergeRequestUrl').exactly(5).withArgs(any, validate);
            gnMock.expects('getDataRecursively').exactly(5).withArgs(any, any, any, any, any, any);
            gamr.getMergeRequestsForEachProject(projects);
            gnMock.verify();
        });
        
        describe('mergeReqCompleteCallback', function() {
            it('should call appendToOrig if there is data', function() {
                gnMock.expects('appendToOrig').exactly(1).withArgs(sinon.match.array, sinon.match.array);
                var data = [{ id: 1 }];
                gamr.mergeReqCompleteCallback(data, { requests: new Array() });
                gnMock.verify();
            });
            
            it('should remove entry from initialMergeRequestCalls if a match was found ', function () {
                gnMock.expects('appendToOrig').exactly(0).withArgs(sinon.match.array, sinon.match.array);
                var calls = [{ url: 'foo' }, { url: 'bar' }];
                gamr.setInitialMergeRequestCalls(calls);
                gamr.mergeReqCompleteCallback([], { requests: calls });
                var actual = gamr.getInitialMergeRequestCalls();
                expect(actual.length).toEqual(1);
                gnMock.verify();
            });
            
            it('should invoke callback when all calls have been returned and accounted for ', function () {
                var calls = [];
                gamr.setInitialMergeRequestCalls(calls);
                gamr.mergeReqCompleteCallback([], { requests: calls });
                sinon.assert.calledOnce(completeCallBackStub);
            });
        });
        
    });


});