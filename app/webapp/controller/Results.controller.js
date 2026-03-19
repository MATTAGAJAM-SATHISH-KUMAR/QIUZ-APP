sap.ui.define([
    "./BaseController",
    "../model/formatter"
], function (BaseController, formatter) {
    "use strict";

    return BaseController.extend("quiz.app.controller.Results", {
        formatter: formatter,

        onInit: function () {
            this.getRouter().getRoute("results").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            if (!this.checkAuth()) { return; }
            var oTable = this.byId("resultsTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.refresh();
            }
        },

        onViewDetails: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("quiz");
            var sAttemptId = oCtx.getProperty("ID");
            this.navTo("attemptReview", { attemptId: sAttemptId });
        }
    });
});
