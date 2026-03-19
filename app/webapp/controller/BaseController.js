sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, History, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("quiz.app.controller.BaseController", {
        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        getModel: function (sName) {
            return this.getView().getModel(sName) || this.getOwnerComponent().getModel(sName);
        },

        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        getAppViewModel: function () {
            return this.getModel("appView");
        },

        getUser: function () {
            return this.getAppViewModel().getProperty("/user");
        },

        checkAuth: function () {
            return true;
        },

        onNavBack: function () {
            var sPreviousHash = History.getInstance().getPreviousHash();
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getRouter().navTo("dashboard", {}, true);
            }
        },

        showMessage: function (sMsg) {
            MessageToast.show(sMsg);
        },

        showError: function (sMsg) {
            MessageBox.error(sMsg);
        },

        callAction: function (sModel, sAction, oParams) {
            var oModel = this.getModel(sModel);
            var oBinding = oModel.bindContext("/" + sAction + "(...)");

            if (oParams) {
                Object.keys(oParams).forEach(function (sKey) {
                    oBinding.setParameter(sKey, oParams[sKey]);
                });
            }

            return oBinding.execute().then(function () {
                return oBinding.getBoundContext().getObject();
            });
        },

        navTo: function (sRoute, oParams) {
            this.getRouter().navTo(sRoute, oParams || {});
        }
    });
});
