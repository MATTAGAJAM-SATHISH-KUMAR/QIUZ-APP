sap.ui.define([
    "../BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "../../model/formatter"
], function (BaseController, JSONModel, MessageBox, formatter) {
    "use strict";

    return BaseController.extend("quiz.app.controller.admin.Analytics", {
        formatter: formatter,

        onInit: function () {
            this.setModel(new JSONModel({
                busy: true,
                quizTitle: "",
                totalAttempts: 0,
                uniqueStudents: 0,
                avgScore: 0,
                passRate: 0,
                scoreDistribution: [],
                questionAccuracy: []
            }), "analyticsView");

            this.getRouter().getRoute("analytics").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            if (!this.checkAuth()) { return; }
            var sQuizId = oEvent.getParameter("arguments").quizId;
            if (sQuizId) {
                this._loadAnalytics(sQuizId);
            }
        },

        _loadAnalytics: function (sQuizId) {
            var oAnalyticsModel = this.getModel("analyticsView");
            oAnalyticsModel.setProperty("/busy", true);

            this.callAction("admin", "getQuizAnalytics", { quizId: sQuizId })
                .then(function (oResult) {
                    oAnalyticsModel.setProperty("/totalAttempts", oResult.totalAttempts || 0);
                    oAnalyticsModel.setProperty("/uniqueStudents", oResult.uniqueStudents || 0);
                    oAnalyticsModel.setProperty("/avgScore", parseFloat(oResult.avgScore || 0).toFixed(1));
                    oAnalyticsModel.setProperty("/passRate", parseFloat(oResult.passRate || 0).toFixed(1));
                    oAnalyticsModel.setProperty("/scoreDistribution", oResult.scoreDistribution || []);
                    oAnalyticsModel.setProperty("/questionAccuracy", oResult.questionAccuracy || []);
                    oAnalyticsModel.setProperty("/busy", false);
                })
                .catch(function (oError) {
                    oAnalyticsModel.setProperty("/busy", false);
                    MessageBox.error("Failed to load analytics. " + (oError.message || ""));
                });

            // Load quiz title
            var oAdminModel = this.getModel("admin");
            var oBinding = oAdminModel.bindContext("/Quizzes('" + sQuizId + "')");
            oBinding.requestObject().then(function (oQuiz) {
                oAnalyticsModel.setProperty("/quizTitle", oQuiz.title);
            });
        }
    });
});
