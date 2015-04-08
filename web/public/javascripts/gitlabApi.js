var getQsParam = function (qs, name) {
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

var getProjectUrl = function (host) {
    //does not return any query string parameters
    var url = host + '/api/v3/projects';
    return url;
};

var getGitLabUrlParams = function (token, pageNum, perPage) {
    var reqParams = {};
    reqParams.per_page = perPage;
    reqParams.private_token = token;
    reqParams.page = pageNum;
    return reqParams;
};


var getNextLink = function (resp) {
    //does not work in browser
    var link = resp.getResponseHeader('Link');
    return getNextLinkNoJquery(link);
};

var getNextLinkNoJquery = function (link) {
    //does not work in browser, browser security
    //this method assumes that next is the first in the link
    //and proper spacing in the search
    var idx = link.search('; rel="next"');
    if (idx < 0) {
        return null;
    }
    var res = link.slice(1, idx - 1);
    return res;
};

var getProjectsRecursively = function (url, params, successCallback, projects) {
    if (!projects) {
        projects = [];
    }
    $.get(url, params).done(function (data) {
        projects = projects.concat(data);
        params.page++; //advance the page number
        if (data.length > 0) {
            getProjectsRecursively(url, params, successCallback, projects);
        } else {
            successCallback(projects);
        }
    });
};