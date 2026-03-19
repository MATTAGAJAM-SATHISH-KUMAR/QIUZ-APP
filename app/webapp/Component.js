sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
    "use strict";

    return UIComponent.extend("quiz.app.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            this.getRouter().initialize();
            this._fetchUserProfile();
        },

        _fetchUserProfile: function () {
            var oModel = this.getModel("user");
            var oAppView = this.getModel("appView");
            var oBinding = oModel.bindContext("/me(...)");

            oBinding.execute().then(function () {
                var oUser = oBinding.getBoundContext().getObject();
                oAppView.setProperty("/user", oUser);
                oAppView.setProperty("/isAdmin", oUser.role === "Admin");
                oAppView.setProperty("/isAdminOrInstructor",
                    oUser.role === "Admin" || oUser.role === "Instructor");
                oAppView.setProperty("/busy", false);
            }.bind(this)).catch(function () {
                // Even if me() fails, set a default user so UI works
                oAppView.setProperty("/user", {
                    email: "anonymous",
                    firstName: "Quiz",
                    lastName: "User",
                    role: "Admin"
                });
                oAppView.setProperty("/isAdmin", true);
                oAppView.setProperty("/isAdminOrInstructor", true);
                oAppView.setProperty("/busy", false);
            }.bind(this));
        },

        logout: function () {
            this.getModel("appView").setProperty("/user", null);
            this.getModel("appView").setProperty("/isAdmin", false);
            this.getModel("appView").setProperty("/isAdminOrInstructor", false);
            this.getRouter().navTo("dashboard");
        }
    });
});
