sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (BaseController, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return BaseController.extend("quiz.app.controller.JoinByCode", {
        onInit: function () {
            this.setModel(new JSONModel({
                shareCode: "",
                accessCode: "",
                busy: false
            }), "joinView");

            this.getRouter().getRoute("joinByCode").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            if (!this.checkAuth()) { return; }
        },

        onJoinQuiz: function () {
            var oJoinModel = this.getModel("joinView");
            var sShareCode = oJoinModel.getProperty("/shareCode").trim();
            var sAccessCode = oJoinModel.getProperty("/accessCode").trim();

            if (!sShareCode) {
                MessageBox.warning(this.getResourceBundle().getText("shareCodeRequired"));
                return;
            }

            oJoinModel.setProperty("/busy", true);

            var oParams = { shareCode: sShareCode };
            if (sAccessCode) {
                oParams.accessCode = sAccessCode;
            }

            this.callAction("quiz", "joinByCode", oParams)
                .then(function (oResult) {
                    var sMsg = this.getResourceBundle().getText("joinSuccess", [oResult.title]);
                    MessageToast.show(sMsg);
                    this.navTo("takeQuiz", { quizId: oResult.quizId });
                }.bind(this))
                .catch(function (oError) {
                    var sMsg = oError.message || "Failed to join quiz.";
                    MessageBox.error(sMsg);
                })
                .finally(function () {
                    oJoinModel.setProperty("/busy", false);
                });
        }
    });
});
