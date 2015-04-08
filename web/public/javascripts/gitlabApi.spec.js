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
            var projParams = getGitLabUrlParams(glToken, 1, 100);
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

        var projParams = getGitLabUrlParams(gitLabPrivateApiToken, 1, 2);
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
            server.respondWith("GET", projUrl + '?' + $.param(getGitLabUrlParams(gitLabPrivateApiToken, 2, 2)),
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

        it('should get rest of projects if head link has a next url', function () {
            var nextLink;
            $.get(projUrl, projParams).done(function (data, status, resp) {
                nextLink = getNextLink(resp);
                done();
            });
            server.respond();
            expect(nextLink.length).toBeGreaterThan(5);
        });

        it('should not get rest of projects if head link does not have a next url', function () {
            //I could not get $.get to make a second call so I'm just checking for a null value.
            var nextLink;

            $.get(projUrl + '?' + $.param(getGitLabUrlParams(gitLabPrivateApiToken, 2, 2))).done(function (data, status, resp) {
                nextLink = getNextLink(resp);
                expect(nextLink).toBeNull();
                done();
            });

            server.respond();
            expect(nextLink).toBeNull();
        });

    });

    describe("Get Projects integration test", function () {
        //This will fail unless private_token and gitlab are set in the testing url
        //will request to see 2 projects at a time and loop through till no more data is returned.
        var projects = [];
        //jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
        var qs = window.location.search;
        var gitLabPrivateApiToken = getQsParam(qs, "private_token");
        var gitLabServer = getQsParam(qs, 'gitlab');
        var projParams = getGitLabUrlParams(gitLabPrivateApiToken, 1, 2);//start with first page
        var projUrl = getProjectUrl(gitLabServer);

        beforeEach(function (done) {
            //get projects and call done when finished
            getProjectsRecursively(projUrl, projParams, function (data) {
                projects = data;
                done();//this can be omitted in production
            });
        });

        it('should return all projects', function () {
            expect(projects.length).toBeGreaterThan(5);//assuming you have more than 5 projects in your real gitlab
        });

    });

});