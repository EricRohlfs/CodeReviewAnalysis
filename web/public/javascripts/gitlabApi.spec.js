describe('How to run tests with real dependencies', function () {
    var qs = window.location.search;
    var gitLabPrivateApiToken = getQsParam(qs, "private_token");
    var gitLabServer = getQsParam(qs, 'gitlab');

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
            var glToken = "abcdefghijklmn";
            var glUrl = "https://gitlab.example.com";
            var projParams = getBaseGitLabUrlParams(glToken, 1, 100);
            var projUrl = getProjectUrl(glUrl) + '?' + $.param(projParams);
            expect(projUrl).toEqual('https://gitlab.example.com/api/v3/projects?per_page=100&private_token=abcdefghijklmn&page=1');
        });
    });

    describe('Using mocked jQuery to get project data ', function () {
        var server,
            fakeData1 = [{ id: 1, name: "Project1" }, { id: 2, name: "Project2" }],
            fakeData2 = [{ id: 1, name: "Project3" }, { id: 2, name: "Project4" }],
            gitLabPrivateApiToken = "abcdefghijkl",
            gitLabServer = "https://gitlab.example.com";

        var projParams = getBaseGitLabUrlParams(gitLabPrivateApiToken, 1, 2);
        var projUrl = getProjectUrl(gitLabServer);

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
            server.respondWith("GET", projUrl + '?' + $.param(getBaseGitLabUrlParams(gitLabPrivateApiToken, 2, 2)),
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
        appendToOrig(orig, newData);
        expect(orig[1].foo).toBe('bar1');
    });
});


describe('makeNextCall', function () {
    var goGetterTestImplementation,
        newData, data, url, params, completedSpy;
    beforeEach(function () {
        newData = [{ 'foo': 'bar' }, { 'foo': 'bar1' }],
        data = new Array(),
        url = 'https://gitlab.example.com';
        params = getMergeReqParams("abc", 1, 2);
        completedSpy = sinon.spy();
        var bag = {};
        bag.requests = new Array();

        goGetterTestImplementation = function (url1, params1, completedCallback1, data1, bag1) {
            var newData1 = new Array();
            if (data1.length < 3) {
                newData1.push({ 'foo': 'bar3' });
                newData1.push({ 'foo': 'bar4' });
            }
            bag1.count++;
            makeNextCall(newData1, data1, url1, params1, completedCallback1, goGetterTestImplementation,bag1 );
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
        makeNextCall(newData, data, url, params, completedSpy, goGetterTestImplementation, bag);
        expect(params.page).toEqual(3);
    });

    it('should keep appending data untill no more data is returned from the goGetter and then invoke completedCallback.', function () {
        var bag = {};
        bag.requests = new Array();
        makeNextCall(newData, data, url, params, completedSpy, goGetterTestImplementation, bag);
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

        makeNextCall(newData, data, url, params, completed, goGetterTestImplementation, bag);
        expect(bag.count).toEqual(3);
    });
    
});

describe('Gitlab Merge Request API', function () {

    it('should return url for merge request minus the query string', function () {
        var expectedUrl = "https://gitlab.example.com:8088/api/v3/projects/29/merge_requests",
            projectId = 29,
            host = 'https://gitlab.example.com:8088';

        var actualUrl = getMergeRequestUrl(host, projectId);
        expect(actualUrl).toBe(expectedUrl);
    });

    it('should return params needed for merge request api call', function () {
        //after we run the object through the params in jquery we should have the following:  state=all&page=2&per_page=100&private_token=abc"
        var token = 'abc',
             page = 1,
             perPage = 100;

        var p = getMergeReqParams(token, page, perPage);

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
            addRequestToBag(url1, params1, bag1);
        };
        getDataRecursively(url, params, completed, data, bag, preGetHook) ;
        server.respond();
    });

    it('should call $.get which should call the callback function', function() {
        var completed = function (data1, bag1) {
            done();
        };
        var callback = sinon.spy(completed);
        getDataRecursively(url, params, callback, data, bag);
        server.respond();
        sinon.assert.calledOnce(callback);
    });

});