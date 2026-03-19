sap.ui.define([
    "../BaseController",
    "../../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, formatter, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("quiz.app.controller.admin.Users", {
        formatter: formatter,

        onInit: function () {
            this.getRouter().getRoute("users").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            if (!this.checkAuth()) { return; }
            var oTable = this.byId("usersTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.refresh();
            }
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            var oTable = this.byId("usersTable");
            var oBinding = oTable.getBinding("items");

            var aFilters = [];
            if (sQuery) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("email", FilterOperator.Contains, sQuery),
                        new Filter("firstName", FilterOperator.Contains, sQuery),
                        new Filter("lastName", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                }));
            }
            oBinding.filter(aFilters);
        }
    });
});
