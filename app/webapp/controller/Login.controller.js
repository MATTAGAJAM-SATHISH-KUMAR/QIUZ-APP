sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (BaseController, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return BaseController.extend("quiz.app.controller.Login", {
        onInit: function () {
            this.setModel(new JSONModel({ busy: false }), "loginView");
            this.getRouter().getRoute("login").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            if (this.getUser()) {
                this.navTo("dashboard");
            }
        },

        onLoginAdmin: function () {
            this._doLogin("admin@quiz.app", "admin");
        },

        onLoginInstructor: function () {
            this._doLogin("instructor@quiz.app", "instructor");
        },

        onLoginStudent: function () {
            this._doLogin("student@quiz.app", "student");
        },

        _doLogin: function (sEmail, sPassword) {
            var oLoginModel = this.getModel("loginView");
            oLoginModel.setProperty("/busy", true);

            this.getOwnerComponent().login(sEmail, sPassword)
                .then(function (oUser) {
                    MessageToast.show("Welcome, " + (oUser.firstName || oUser.email) + "!");
                    this.navTo("dashboard");
                }.bind(this))
                .catch(function () {
                    MessageBox.error(this.getResourceBundle().getText("loginFailed"));
                }.bind(this))
                .finally(function () {
                    oLoginModel.setProperty("/busy", false);
                });
        }
    });
});
