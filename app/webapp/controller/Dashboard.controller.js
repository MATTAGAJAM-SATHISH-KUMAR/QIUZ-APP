sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter"
], function (BaseController, JSONModel, formatter) {
    "use strict";

    return BaseController.extend("quiz.app.controller.Dashboard", {
        formatter: formatter,

        onInit: function () {
            this.setModel(new JSONModel({
                quizCount: 0,
                attemptCount: 0,
                recentAttempts: []
            }), "dashView");

            this.getRouter().getRoute("dashboard").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            if (!this.checkAuth()) { return; }
            this._loadDashboardData();
        },

        _loadDashboardData: function () {
            var oQuizModel = this.getModel("quiz");

            // Load available quizzes count
            var oQuizList = oQuizModel.bindList("/AvailableQuizzes");
            oQuizList.requestContexts(0, 1000).then(function (aContexts) {
                this.getModel("dashView").setProperty("/quizCount", aContexts.length);
            }.bind(this));

            // Load my attempts
            var oAttemptList = oQuizModel.bindList("/MyAttempts", null, [
                new sap.ui.model.Sorter("createdAt", true)
            ]);
            oAttemptList.requestContexts(0, 5).then(function (aContexts) {
                var aAttempts = aContexts.map(function (oCtx) { return oCtx.getObject(); });
                var oDashModel = this.getModel("dashView");
                oDashModel.setProperty("/attemptCount", aAttempts.length);
                oDashModel.setProperty("/recentAttempts", aAttempts);
            }.bind(this));
        },

        onQuizzesPress: function () {
            this.navTo("quizList");
        },

        onResultsPress: function () {
            this.navTo("results");
        },

        onJoinPress: function () {
            this.navTo("joinByCode");
        },

        onAdminPress: function () {
            this.navTo("adminQuizList");
        },

        onAttemptPress: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("dashView");
            var sAttemptId = oCtx.getProperty("ID");
            this.navTo("attemptReview", { attemptId: sAttemptId });
        }
    });
});
