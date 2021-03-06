﻿/**
 * Builds urls for GitLab version 3 of the api.
 * The goal is to keep the query strings as objects for as long as possible, let jQuery or other implementation convert the objects to query string parameters.
 * @returns {object} urlHelpers
 * @returns {function} urlHelpers.getProjectUrl
 * @returns {function} urlHelpers.getMergeRequestUrl
 * @returns {function} urlHelpers.getBaseGitLabUrlParams
 * @returns {function} urlHelpers.getMergeReqParams
 */
var gitLabV3Urls = function () {
    /**
     * @summary builds the url without parameters for getting the list of Projects..
     * @param {string} host - host name from a FQDN, should include protcol (http or https) e.g. https://gitlab.example.com
     */
    var getProjectUrl = function (host) {
        //does not return any query string parameters
        var url = host + '/api/v3/projects';
        return url;
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
     * @summary base set of parameters for HTTP GET commands mostly allows access and supports pagination since Gitlab forces pagination.
     * @param {string} token - the private token generated by Gitlab to allow access to a user or an applictaion.
     * @param {number} pageNum - page number needed since gitlab forces pagination on calls.
     * @param {number} perPage - number of items to return per page
     * @returns {object} params
     * @returns {number} params.per_page
     * @returns {number} params.page
     * @returns {string} params.private_token
    */
    var getBaseGitLabUrlParams = function (token, pageNum, perPageNumberOfItems) {
        var reqParams = {};
        reqParams.per_page = perPageNumberOfItems;
        reqParams.private_token = token;
        reqParams.page = pageNum;
        return reqParams;
    };
    
    /**
     * @summary returns an object that can be serialized into a query string
     * @param {string} token this is the private api token generated by gitlab to allow a user or an application to use the api.
     * @param {number} pageNum
     * @param {number} perPage
     * @returns {object} params
     * @returns {string} state [state=all] - default value is all
     * @returns {number} params.per_page
     * @returns {number} params.page
     * @returns {string} params.private_token
     */
    var getMergeReqParams = function (token, pageNum, perPage) {
        var p = getBaseGitLabUrlParams(token, pageNum, perPage);
        p.state = 'all';
        return p;
    };

    return {
        getProjectUrl: getProjectUrl,
        getMergeRequestUrl: getMergeRequestUrl,
        getBaseGitLabUrlParams: getBaseGitLabUrlParams,
        getMergeReqParams: getMergeReqParams
    };
};


/**
 * @summary {object} glNext - short for GitLab Next, set of functions that help get all the data from GitLab since Gitlab forces pagination on api requests.
 * @returns {function} getQsParam
 * @returns {function} getProjectUrl
 * @returns {function} getBaseGitLabUrlParams
 * @returns {function} getMergeRequestUrl
 * @returns {function} getMergeReqParams
 * @returns {function} addRequestToBag
 * @returns {function} appendToOrig
 * @returns {function} getDataRecursively
 * @returns {function} NextCall
*/
var glNext = function () {

    /**
     * @summary given a query string and a name this should return the value of that parameter
     * @param {string} qs - short for query string usually from the address bar
     * @param {number} paramName - name of the parameter to return the value of 
     * @returns {string}  
     */
    var getQsParam = function (qs, paramName) {
        var result = "Not found", tmp = [];
        qs.substr(1)
            .split("&")
            .forEach(function (item) {
                tmp = item.split("=");
                if (tmp[0] === paramName) result = decodeURIComponent(tmp[1]);
            });
        return result;
    };

    /**
     * @summary if requests is defined, each request will be added to the bag
     * @param {string} url should be the url to the gitlab api we are calling minus the parameters or query string, be sure to include http or https
     * @param {Object} params these will be transformed into query string parameters
     * @param {Object} bag place to add extra metadata
     * @returns {undefined}
     */
    var addRequestToBag = function (url, params, bag) {
        if (!bag || !bag.requests) {
            return;
        }
        var request = {
            url: url,
            params: params
        };
        bag.requests.push(request);
    };
    
    /**
     *@summary merges newData onto orig, but does not return a new array since arrays are passed by ref, should save memory. Not sure if I should erase all the data in newData or not.
     *@param {array} orig the original array
     *@param {array} newData the new data to append to orig
     *@returns {undefined}
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
     *@summary implementation agnostic logic for calling next url if there is data from the previous call. 
     * If the call has data, then the newData is merged into our existing data, the page number is incremeted, a request to the next set of data is created. 
     * If the call returns an empty array, then the completedCallback function is called.
     * This was originally part of getDataRecursively, but was broken out for reasons that made sense at the time, but could possibly be re-integrated now.
     *@param {array} newData the data returned by jQuery or what ever async call
     *@param {array} data the previous calls data the new data should be added to this
     *@param {string} url the url to gitlab
     *@param {object} params url parameters for pagination token and other items
     *@param {function} completedCallback when there is no more data returned from a call this is called and the full list of data is passed into it
     *@param {function} serviceCaller - this is the implementation that will be called again if data is returned from the last request. This abstraction also allows for better unit testing.
     *@param {Object} bag place to add extra metadata
     *@param {Object} preGetHook will just be passed through to goGetter
     *@returns {undefined}
    */
    var makeNextCall = function (newData, data, url, params, completedCallback, serviceCaller, bag, preGetHook) {
        if (newData.length > 0) {
            appendToOrig(data, newData);
            params.page++; //advance the page number
            serviceCaller(url, params, completedCallback, data, bag, preGetHook);
        } else {
            completedCallback(data, bag);
        }
    };

    /**
     * @summary since Gitlab limits the number of return items on an api call, we need to keep calling till we do not have anymore records to return.
     * @param {string} url should be the url to the gitlab api we are calling minus the parameters or query string, be sure to include http or https
     * @param {Object} these will be transformed into query string parameters
     * @param {function} successCallback when no more results are returned from the server this method is called 
     * @param {Array} data array of objects passed in from the previous call, when all calls are complete this is the data that will be returned to the client. 
     * @param {Object} bag place to add extra metadata
     * @param {function} preGetHook executes a function before calling $.get totally optional, follows the same signature of getDataRecursively minus the preGetHook and completedCallback
     * @external "jQuery.get"
     * @see {@link https://api.jquery.com/jquery.get/ jQuery Get()}
     * @external "jQuery.deferred.done"
     * @see {@like https://api.jquery.com/deferred.done/ deferred.done()}
    */
    var getDataRecursively = function (url, params, completedCallback, data, bag, preGetHook) {
        if (!data) {
            //since this is logging code I am not unit testing it.
            console.error('when calling getDataRecursively the argument called data must be an initialized array');
        }
        if (!params.page) {
            console.error('getDataRecursively -> params.page needs to be defined as a number. Auto paging for gitlab is one of the main points of this library.');
        }
        if (preGetHook) {
            preGetHook(url, params, data, bag);
        }
        var go = function (newData) {
            makeNextCall(newData, data, url, params, completedCallback, getDataRecursively, bag, preGetHook);
        };
        $.get(url, params).done(go);
    };
    
    return {
        getQsParam: getQsParam,
        getProjectUrl: gitLabV3Urls().getProjectUrl,
        getBaseGitLabUrlParams: gitLabV3Urls().getBaseGitLabUrlParams,
        getMergeRequestUrl: gitLabV3Urls().getMergeRequestUrl,
        getMergeReqParams: gitLabV3Urls().getMergeReqParams,
        addRequestToBag: addRequestToBag,
        appendToOrig:appendToOrig,
        getDataRecursively: getDataRecursively,
        makeNextCall: makeNextCall
    };
};

/*
 * @summary will return all merge requests
 * @param {function} callBack - function to call when we have info for all merge requests for each project.
 * @param {function} implementation - basically gn.getDataRecursively(projUrl, projParams, projCallback, dataProj);
 * @param {string} qs - query string or string to parse out token and gitlab server var qs = window.location.search;
 * @param {object} gn [gn = glNext()] - getNext but to support IOC and testing.
 * @returns {} obj
 * @returns {function} obj.getInitialMergeRequestCalls - unit testing support
 * @returns {function} getAllProjects
 * @returns {function} getMergeRequestsForEachProject
 * @returns {function} mergeReqCompleteCallback: mergeReqCompleteCallback
 * @returns {function} getInitialMergeRequestCalls
 * @returns {function} setInitialMergeRequestCalls
*/
var getAllMergeRequestsForAllProjects = function (callBack, requestImplementation,qs,gn) {
    var allMergeRequests = [], //all merge requests when done
        initialMergeRequestCalls = [], //place to hold the original merge request with the first page number, basically creates a distinct list to later compare all merge requests against to know when we are done.
        gitLabPrivateApiToken = gn.getQsParam(qs, "private_token"),
        gitLabServer = gn.getQsParam(qs, 'gitlab');

    /*
     * @summary wrapper for adding the request data to the bag object
     * @param {string} url
     * @param {object} qsParams - object that is later converted to a query string and appended to the url
     * @param {array} data - currently not used in this method
     * @param {object} bag - place to store random data while looping 
     * @returns {undefined}
     */
    var addRequestToBag = function (url, qsParams, data, bag) {
        gn.addRequestToBag(url, qsParams, bag);
    };

    /*
     * @summary this will be called once for each project will build up a complete list of merge requests and call callBack when everything is done.
     * we are essentially making all of this synchrnous at this point.
     * there is the possibility the callback is never called, 
     * I have not seen this in integration tests, but if there is a problem I bet it is in here.
     * @param {array} data - the data should be an array of merge request objects
     * @param {object} bag - bag for random data
     * @returs {undefined}
     */
    var mergeReqCompleteCallback = function (data, bag) {
        if (data && data.length > 0) {
            gn.appendToOrig(allMergeRequests, data);
        }
        //remove itmes from initialMergeRequestCalls if a match is found in the list of bag requests
        //this should be before the check to call the call back, not sure I want to refactor to test for that right now.
        for (var j = 0; j < bag.requests.length; j++) {
            for (var i = 0; i < initialMergeRequestCalls.length; i++) {
                var reqUrl = initialMergeRequestCalls[i].url;
                var bagUrl = bag.requests[j].url;
                if (reqUrl === bagUrl) {
                    initialMergeRequestCalls.splice(i, 1); //remove the found match
                    break;
                }
            }
        }
        
        if (initialMergeRequestCalls.length === 0) {
            callBack(allMergeRequests);
        }
    };

    /*
     * @summary mainly used for testing
     * @returns {array} - we make a bunch of calls, but this is the first one for each project
     */
    var getInitialMergeRequestCalls = function () {
        return initialMergeRequestCalls;
    };
    
    /*
     * @summary helper method for testing to set private property
     * @params {array} data of objects{url:'',params:{}}
     * @returns {undefined}
    */
    var setInitialMergeRequestCalls = function(data) {
        initialMergeRequestCalls = data;
    };

    /*
     * @summary after we get all projects we need to loop through each project and get the merge requests associated with the project.
     * @param {array} projectsCalled array of objects for all the project data
     */
    var getMergeRequestsForEachProject = function (projectsCalled) {
        for (var i = 0; i < projectsCalled.length; i++) {
            var mrBag = { requests: [] }; // bag to hold merge request stuff and we need a list of all the requests made so we can later ensure we have all the data before saying we are done. 
            var mergeReqParams = gn.getMergeReqParams(gitLabPrivateApiToken, 1, 100); //start with first page and return 3 items per request
            var mergeReqUrl = gn.getMergeRequestUrl(gitLabServer, projectsCalled[i].id);
            initialMergeRequestCalls.push({
                url: mergeReqUrl,
                params: mergeReqParams
            });
            gn.getDataRecursively(mergeReqUrl, mergeReqParams, mergeReqCompleteCallback, [], mrBag, addRequestToBag);
        }
    };

    /*
     * @summary gets a list of all projects
     * @callback {function} done returns
     * @returns {undefined}
    */
    var getAllProjects = function (done) {
        /*
         * wrapper for the callback for any internal work we may need to do.
        */
        var projCallback = function (data) {
            done(data);
        };
        var projParams = gn.getBaseGitLabUrlParams(gitLabPrivateApiToken, 1, 100);
        var projUrl = gn.getProjectUrl(gitLabServer);
        var dataProj = [];
        //get projects and call done when finished
        requestImplementation(projUrl, projParams, projCallback, dataProj);
    };
    return {
        getAllProjects: getAllProjects,
        getMergeRequestsForEachProject: getMergeRequestsForEachProject,
        mergeReqCompleteCallback: mergeReqCompleteCallback,
        getInitialMergeRequestCalls: getInitialMergeRequestCalls,
        setInitialMergeRequestCalls: setInitialMergeRequestCalls
    };

};



