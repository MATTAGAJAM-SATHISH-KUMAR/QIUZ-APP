sap.ui.define([
    "../BaseController",
    "../../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (BaseController, formatter, Filter, FilterOperator, MessageToast, MessageBox) {
    "use strict";

    return BaseController.extend("quiz.app.controller.admin.QuizList", {
        formatter: formatter,

        onInit: function () {
            this.getRouter().getRoute("adminQuizList").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            if (!this.checkAuth()) { return; }
            var oTable = this.byId("adminQuizTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.refresh();
            }
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            var oTable = this.byId("adminQuizTable");
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

        onCreateQuiz: function () {
            this.navTo("newQuiz");
        },

        onEditQuiz: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("admin");
            var sQuizId = oCtx.getProperty("ID");
            this.navTo("quizEditor", { quizId: sQuizId });
        },

        onPublishQuiz: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("admin");
            var sQuizId = oCtx.getProperty("ID");
            var sStatus = oCtx.getProperty("status");

            var sAction = sStatus === "published" ? "unpublishQuiz" : "publishQuiz";

            this.callAction("admin", sAction, { quizId: sQuizId })
                .then(function () {
                    var sMsg = sStatus === "published"
                        ? this.getResourceBundle().getText("quizUnpublished")
                        : this.getResourceBundle().getText("quizPublished");
                    MessageToast.show(sMsg);
                    this.byId("adminQuizTable").getBinding("items").refresh();
                }.bind(this))
                .catch(function (oError) {
                    MessageBox.error(oError.message || "Action failed.");
                });
        },

        onAnalytics: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("admin");
            var sQuizId = oCtx.getProperty("ID");
            this.navTo("analytics", { quizId: sQuizId });
        },

        onDeleteQuiz: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("admin");

            MessageBox.confirm(this.getResourceBundle().getText("deleteConfirm"), {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        oCtx.delete().then(function () {
                            MessageToast.show(this.getResourceBundle().getText("quizDeleted"));
                        }.bind(this)).catch(function (oError) {
                            MessageBox.error(oError.message || "Delete failed.");
                        });
                    }
                }.bind(this)
            });
        }
    });
});
