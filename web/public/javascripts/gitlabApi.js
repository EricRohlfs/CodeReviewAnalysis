﻿var getQsParam = function (qs, name) {
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

/**
   * @summary returns an object that can be serialized into a query string
   * @param {string} token this is the private api token generated by gitlab to allow a user or an application to use the api.
   * @param {number} pageNum
   * @param {number} perPage number of items to return per call. Gitlab limits the max, hence the need for this library.
   */
var getBaseGitLabUrlParams = function (token, pageNum, perPage) {
    var reqParams = {};
    reqParams.per_page = perPage;
    reqParams.private_token = token;
    reqParams.page = pageNum;
    return reqParams;
};

/**
    *@summary merges newData onto orig, but does not return a new array since arrays are passed by ref, should save memory.
    *@param {array} orig the original array
    *@param {array} newData the new data to append to orig
*/
var appendToOrig = function (orig, newData) {
    if (!Array.isArray(orig)) {
        console.log('orig must be an array');
    }
    if (!Array.isArray(newData)) {
        console.log('newData must be an array');
    }
    for (var i = 0; i < newData.length; i++) {
        orig.push(newData[i]);
    }
};

/**
    *@summary implementation agnostic logic for calling next url
    *@param {array} newData the data returned by jQuery or what ever async call
    *@param {array} data the previous calls data the new data should be added to this
    *@param {string} url the url to gitlab
    *@param {object} params url parameters for pagination token and other items
    *@param {function} completedCallback when there is no more data returned from a call this is called and the full list of data is passed into it
    *@param {function} this is the implementation that will be called again if data is returned from the last request. This abstraction also allows for better unit testing.
*/
var makeNextCall = function (newData, data, url, params, completedCallback, goGetter) {
    if (newData.length > 0) {
        appendToOrig(data, newData);
        params.page++; //advance the page number
        goGetter(url, params, completedCallback, data);
    } else {
        completedCallback(data);
    }
};

/**
   * @summary since Gitlab limits the number of return items on an api call, we need to keep calling till we do not have anymore records to return.
   * @param {string} url should be the url to the gitlab api we are calling minus the parameters or query string, be sure to include http or https
   * @param {Object} these will be transformed into query string parameters
   * @param {function} successCallback when no more results are returned from the server this method is called 
   * @param {Array} data array of objects passed in from the previous call, when all calls are complete this is the data that will be returned to the client. 
   */
var getDataRecursively = function (url, params, completedCallback, data) {
    if (!data) {
        //since this is logging code I am not unit testing it.
        console.error('when calling getDataRecursively the argument called data must be an initialized array');
    }
    $.get(url, params).done(function(newData) {
        makeNextCall(newData,data, url, params, completedCallback, getDataRecursively);
    });
};

/**
   * @summary builds the url without parameters for calling the merge request api in gitlab.
   * @param {string} host e.g. https://gitlab.example.com
   * @param {string} projectId usually a number but treating as a string
   */
var getMergeRequestUrl = function (host, projectId) {
    var u = host + '/api/v3/projects/' + projectId + '/merge_requests';
    return u;
};

/**
   * @summary returns an object that can be serialized into a query string
   * @param {string} token this is the private api token generated by gitlab to allow a user or an application to use the api.
   * @param {number} pageNum
   * @param {number} perPage
   */
var getMergeReqParams = function (token, pageNum, perPage) {
    var p = getBaseGitLabUrlParams(token, pageNum, perPage);
    p.state = 'all';
    return p;
};