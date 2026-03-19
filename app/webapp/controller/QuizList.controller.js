sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, formatter, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("quiz.app.controller.QuizList", {
        formatter: formatter,

        onInit: function () {
            this.getRouter().getRoute("quizList").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            if (!this.checkAuth()) { return; }
            // Refresh the quiz list binding
            var oTable = this.byId("quizTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.refresh();
            }
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            var oTable = this.byId("quizTable");
            var oBinding = oTable.getBinding("items");

            var aFilters = [];
            if (sQuery) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("title", FilterOperator.Contains, sQuery),
                        new Filter("category", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                }));
            }
            oBinding.filter(aFilters);
        },

        onQuizPress: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("quiz");
            var sQuizId = oCtx.getProperty("ID");
            this.navTo("takeQuiz", { quizId: sQuizId });
        },

        onStartQuiz: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("quiz");
            var sQuizId = oCtx.getProperty("ID");
            this.navTo("takeQuiz", { quizId: sQuizId });
        }
    });
});
