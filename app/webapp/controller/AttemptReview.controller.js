sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter"
], function (BaseController, JSONModel, formatter) {
    "use strict";

    return BaseController.extend("quiz.app.controller.AttemptReview", {
        formatter: formatter,

        onInit: function () {
            this.setModel(new JSONModel({
                busy: true,
                quizTitle: "",
                totalScore: 0,
                maxScore: 0,
                scorePercentage: 0,
                passed: false,
                answers: []
            }), "reviewView");

            this.getRouter().getRoute("attemptReview").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            if (!this.checkAuth()) { return; }
            var sAttemptId = oEvent.getParameter("arguments").attemptId;
            this._loadReview(sAttemptId);
        },

        _loadReview: function (sAttemptId) {
            var oReviewModel = this.getModel("reviewView");
            oReviewModel.setProperty("/busy", true);

            // Load attempt details
            var oQuizModel = this.getModel("quiz");
            var sFilter = "attempt_ID eq '" + sAttemptId + "'";
            var oListBinding = oQuizModel.bindList("/AttemptReview", null, null, [
                new sap.ui.model.Filter("attempt_ID", "EQ", sAttemptId)
            ]);

            oListBinding.requestContexts(0, 200).then(function (aContexts) {
                var aAnswers = aContexts.map(function (oCtx) { return oCtx.getObject(); });
                oReviewModel.setProperty("/answers", aAnswers);
                oReviewModel.setProperty("/busy", false);
            }).catch(function () {
                oReviewModel.setProperty("/busy", false);
            });

            // Load attempt summary from MyAttempts
            var oAttemptBinding = oQuizModel.bindList("/MyAttempts", null, null, [
                new sap.ui.model.Filter("ID", "EQ", sAttemptId)
            ]);
            oAttemptBinding.requestContexts(0, 1).then(function (aContexts) {
                if (aContexts.length > 0) {
                    var oAttempt = aContexts[0].getObject();
                    oReviewModel.setProperty("/quizTitle", oAttempt.quizTitle || "Quiz");
                    oReviewModel.setProperty("/totalScore", oAttempt.totalScore);
                    oReviewModel.setProperty("/maxScore", oAttempt.maxPossibleScore);
                    oReviewModel.setProperty("/scorePercentage", oAttempt.scorePercentage);
                    oReviewModel.setProperty("/passed", oAttempt.passed);
                }
            });
        }
    });
});
