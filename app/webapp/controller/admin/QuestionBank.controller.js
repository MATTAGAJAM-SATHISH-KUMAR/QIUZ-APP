sap.ui.define([
    "../BaseController",
    "../../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], function (BaseController, formatter, Filter, FilterOperator, MessageToast) {
    "use strict";

    return BaseController.extend("quiz.app.controller.admin.QuestionBank", {
        formatter: formatter,

        onInit: function () {
            this.getRouter().getRoute("questionBank").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            if (!this.checkAuth()) { return; }
            var oTable = this.byId("bankTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.refresh();
            }
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            var oTable = this.byId("bankTable");
            var oBinding = oTable.getBinding("items");

            var aFilters = [];
            if (sQuery) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("questionText", FilterOperator.Contains, sQuery),
                        new Filter("category", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                }));
            }
            oBinding.filter(aFilters);
        },

        onImport: function () {
            MessageToast.show("Import functionality — use CSV or JSON format.");
        },

        onBankItemPress: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("admin");
            var oQuestion = oCtx.getObject();
            MessageToast.show("Question: " + oQuestion.questionText.substring(0, 50) + "...");
        }
    });
});
