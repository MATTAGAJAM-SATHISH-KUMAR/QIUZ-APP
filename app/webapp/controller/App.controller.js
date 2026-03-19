sap.ui.define([
    "./BaseController"
], function (BaseController) {
    "use strict";

    return BaseController.extend("quiz.app.controller.App", {
        onInit: function () {
            // Hide side nav on login route
            this.getRouter().attachRouteMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var sRouteName = oEvent.getParameter("name");
            var oToolPage = this.byId("toolPage");
            // Hide sidebar on login page
            if (sRouteName === "login") {
                oToolPage.setSideExpanded(false);
                this.byId("sideNav").setVisible(false);
            } else {
                this.byId("sideNav").setVisible(!!this.getUser());
            }
        },

        onToggleSideNav: function () {
            var oToolPage = this.byId("toolPage");
            oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
        },

        onNavItemSelect: function (oEvent) {
            var sKey = oEvent.getParameter("item").getKey();
            if (sKey === "analytics") {
                // Analytics needs a quizId — navigate to admin quiz list to select
                this.navTo("adminQuizList");
            } else {
                this.navTo(sKey);
            }
        },

        onLogout: function () {
            this.getOwnerComponent().logout();
        }
    });
});
