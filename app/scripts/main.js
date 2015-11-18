'use strict';

var app = angular.module('rollup', []);

/**
 * Main controller
 */
app.controller('MainController', ['$scope', function($scope) {
    var octo,
        repo,
        settings;

    $scope.state = {
        error: false,
        loading: true
    };
    $scope.openSettings = openSettings;
    $scope.createPR = createPR;
    $scope.refresh = refresh;
    $scope.ups = [];
    $scope.repo = null;

    // Get extension settings and kick things off
    chrome.storage.sync.get({
        token: '',
        user: '',
        repo: '',
        regex: ''
    }, init);

    /**
     * Initialize the extension
     * @param  {Object} s storedSettings
     */
    function init(storedSettings) {
        settings = storedSettings;

        if (!settings.token || !settings.user || !settings.repo) {
            error();
            return;
        }

        octo = new Octokat({
            token: settings.token,
        });
        repo = octo.repos(settings.user, settings.repo);
        refresh();
    }

    /**
     * Show error state
     */
    function error() {
        $scope.state.loading = false;
        $scope.state.error = true;
        $scope.$digest();
    }

    /**
     * Stop the loading state
     */
    function stopLoading() {
        $scope.state.loading = false;
        $scope.$digest();
    }

    /**
     * Open the settings page
     */
    function openSettings() {
        chrome.runtime.openOptionsPage();
    }

    /**
     * Create PR
     * @param {Object} up
     */
    function createPR(up) {
        $scope.repo.pulls.create({
            title: 'chore(Merge): ' + up.head.name + ' --> ' + up.base.name,
            body: '',
            head: up.head.name,
            base: up.base.name
        }).then(function(data) {
            up.pr = data;
            $scope.$digest();
        });
    }

    /**
     * Refresh branches/PRs
     */
    function refresh() {
        if (octo) {
            repo.fetch()
                .then(setRepo)
                .then(loadBranches)
                .then(setRollUps)
                .then(stopLoading)
                .catch(error);
        } else {
            window.location.reload();
        }

        /**
         * Set the repo details on to the scope
         * @param  {Object} data
         */
        function setRepo(data) {
            $scope.repo = data;
        }

        /**
         * Load relevant branches from GitHub
         * @return {Promise}
         */
        function loadBranches() {
            var allBranches = [];
            return repo.branches.fetch().then(addBranches).then(sortBranches);

            /**
             * Add branches to the list of branches
             * @param  {Array<Object>}    branches
             */
            function addBranches(branches) {
                allBranches = allBranches.concat(branches.filter(included));
                if (branches.nextPage) {
                    return branches.nextPage().then(addBranches);
                }
            }

            /**
             * Sort the returned branches
             * @method sortBranches
             * @return {Array<Object>}
             */
            function sortBranches() {
                allBranches.map(addMatchGroup);
                return allBranches.sort(byMatchGroup);

                /**
                 * Add match group to each branch
                 * @param {Object} branch
                 */
                function addMatchGroup(branch) {
                    var re = new RegExp(settings.regex),
                        result = re.exec(branch.name),
                        group = 1,
                        i;

                    if (result && result.length) {
                        for (i = 1; i < result.length; i++) {
                            if (result.hasOwnProperty(i)) {
                                if (result[i] !== undefined) {
                                    group = i;
                                }
                            }
                        }
                    }
                    branch.matchGroup = group;
                }

                /**
                 * Sort by the first group matched
                 * @param  {Object}         a
                 * @param  {Object}         b
                 * @return {Integer}
                 */
                function byMatchGroup(a, b) {
                    if (a.matchGroup < b.matchGroup) {
                        return -1;
                    } else if (a.matchGroup > b.matchGroup) {
                        return 1;
                    } else {
                        return 0;
                    }
                }
            }

            /**
             * Filter function, if the branch matches the regex then include
             * @param  {Object} branch
             * @return {Boolean}
             */
            function included(branch) {
                return branch.name.match(settings.regex);
            }
        }

        /**
         * Create the rollups based on the branches
         * @param  {Array<Object>}   branches
         */
        function setRollUps(branches) {
            var i;

            $scope.ups = [];
            for (i = 0; i < branches.length - 1; i++) {
                $scope.ups.push({
                    head: branches[i],
                    base: branches[i + 1]
                });
            }

            for (i = 0; i < $scope.ups.length; i++) {
                loadDiff($scope.ups[i]);
                loadPR($scope.ups[i]);
            }
        }

        /**
         * Load the diff for the specified up
         * @param  {Object} up
         * @return {Promise}
         */
        function loadDiff(up) {
            var comparison = $scope.repo.compare(up.base.name, up.head.name);
            return comparison.fetch().then(function(diff) {
                up.diff = diff;
                $scope.$digest();
                return up;
            });
        }

        /**
         * Load the PR for the specified up
         * @param  {Object} up
         * @return {Promise}
         */
        function loadPR(up) {
            var pr = $scope.repo.pulls,
                filter = {
                    base: up.base.name,
                    head: settings.user + ':' + up.head.name
                };

            return pr.fetch(filter).then(function(pr) {
                if (pr.length) {
                    up.pr = pr[0];
                } else {
                    up.pr = {};
                }
                $scope.$digest();
                return up;
            });
        }
    }
}]);
