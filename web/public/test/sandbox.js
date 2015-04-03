var getQsParam = function(qs, name) {
    var result = "Not found",
        tmp = [];
    qs.substr(1)
        .split("&")
        .forEach(function (item) {
            tmp = item.split("=");
            if (tmp[0] === name) result = decodeURIComponent(tmp[1]);
        });
    return result;
};

var getProjectUrl = function (host, params) {
    var url = host + '/api/v3/projects?' + $.param(params);
    return url;
};

var getGitLabUrlParams = function (token) {
    var reqParams = {};
    reqParams.per_page = 100;
    reqParams.private_token = token;
    return reqParams;
};

describe('How to run tests with dependencies', function () {
    var qs = window.location.search;
    var gitLabPrivateApiToken = getQsParam(qs, "private_token");
    var gitLabServer = getQsParam(qs, 'gitlab');

    //example: http://localhost:3000/test/unit.html?private_token=abcdefghijklmn
    it('should get the private gitlab api token from url in tests so it is not checked into the source code', function() {
        expect(gitLabPrivateApiToken.length).toBeGreaterThan(2);
    });

    //example: http://localhost:3000/test/unit.html?private_token=abcdefghijklmn&gitlab=https://gitlab.example.com
    it('should get the gitlab server name from the url in tests', function() {
        expect(gitLabServer.length).toBeGreaterThan(2);
    });

});

describe('Getting all projects', function () {
    var glUrl = 'https://gitlab.example.com';
    var glToken = "abcdefghijklmn";
 

    it('should build a url to get all projects ', function () {
        var projParams = getGitLabUrlParams(glToken);
        var projUrl = getProjectUrl(glUrl, projParams);
        expect(projUrl).toEqual('https://gitlab.example.com/api/v3/projects?per_page=100&private_token=abcdefghijklmn');
    });


});

