sap.ui.define([
    "../BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "../../model/formatter"
], function (BaseController, JSONModel, MessageToast, MessageBox, Fragment, formatter) {
    "use strict";

    return BaseController.extend("quiz.app.controller.admin.QuizEditor", {
        formatter: formatter,

        onInit: function () {
            this.setModel(new JSONModel({
                busy: false,
                isNew: false,
                quiz: {},
                questions: [],
                editQuestion: null,
                dialogTitle: ""
            }), "editorView");

            this.getRouter().getRoute("quizEditor").attachPatternMatched(this._onEditRoute, this);
            this.getRouter().getRoute("newQuiz").attachPatternMatched(this._onNewRoute, this);
        },

        _onNewRoute: function () {
            if (!this.checkAuth()) { return; }
            var oModel = this.getModel("editorView");
            oModel.setProperty("/isNew", true);
            oModel.setProperty("/quiz", {
                title: "",
                description: "",
                category: "",
                difficulty: "medium",
                timeLimitMinutes: 30,
                passingScorePct: 60,
                attemptsAllowed: 1,
                status: "draft"
            });
            oModel.setProperty("/questions", []);
        },

        _onEditRoute: function (oEvent) {
            if (!this.checkAuth()) { return; }
            var sQuizId = oEvent.getParameter("arguments").quizId;
            this._loadQuiz(sQuizId);
        },

        _loadQuiz: function (sQuizId) {
            var oEditorModel = this.getModel("editorView");
            oEditorModel.setProperty("/busy", true);
            oEditorModel.setProperty("/isNew", false);

            var oAdminModel = this.getModel("admin");

            // Load quiz details
            var oQuizBinding = oAdminModel.bindContext("/Quizzes('" + sQuizId + "')", null, {
                $expand: "versions"
            });
            oQuizBinding.requestObject().then(function (oQuiz) {
                oEditorModel.setProperty("/quiz", oQuiz);

                // Find active version to load questions
                var aVersions = oQuiz.versions || [];
                var oActiveVersion = aVersions.find(function (v) { return v.isActive; });
                if (oActiveVersion) {
                    this._loadQuestions(oActiveVersion.ID);
                }
                oEditorModel.setProperty("/busy", false);
            }.bind(this)).catch(function () {
                oEditorModel.setProperty("/busy", false);
                MessageBox.error("Failed to load quiz.");
            });
        },

        _loadQuestions: function (sVersionId) {
            var oAdminModel = this.getModel("admin");
            var oEditorModel = this.getModel("editorView");

            var oListBinding = oAdminModel.bindList("/Questions", null,
                [new sap.ui.model.Sorter("orderIndex", false)],
                [new sap.ui.model.Filter("quizVersion_ID", "EQ", sVersionId)],
                { $expand: "options" }
            );

            oListBinding.requestContexts(0, 500).then(function (aContexts) {
                var aQuestions = aContexts.map(function (oCtx) {
                    var oQ = oCtx.getObject();
                    oQ.optionCount = (oQ.options || []).length;
                    return oQ;
                });
                oEditorModel.setProperty("/questions", aQuestions);
            });
        },

        onSaveQuiz: function () {
            var oEditorModel = this.getModel("editorView");
            var oQuiz = oEditorModel.getProperty("/quiz");
            var bIsNew = oEditorModel.getProperty("/isNew");

            oEditorModel.setProperty("/busy", true);

            if (bIsNew) {
                var oAdminModel = this.getModel("admin");
                var oListBinding = oAdminModel.bindList("/Quizzes");
                var oContext = oListBinding.create({
                    title: oQuiz.title,
                    description: oQuiz.description,
                    category: oQuiz.category,
                    difficulty: oQuiz.difficulty,
                    timeLimitMinutes: parseInt(oQuiz.timeLimitMinutes) || null,
                    passingScorePct: parseFloat(oQuiz.passingScorePct) || 60,
                    attemptsAllowed: parseInt(oQuiz.attemptsAllowed) || 1
                });
                oContext.created().then(function () {
                    MessageToast.show(this.getResourceBundle().getText("quizSaved"));
                    oEditorModel.setProperty("/busy", false);
                    var sNewId = oContext.getProperty("ID");
                    this.navTo("quizEditor", { quizId: sNewId });
                }.bind(this)).catch(function (oError) {
                    oEditorModel.setProperty("/busy", false);
                    MessageBox.error("Failed to create quiz. " + (oError.message || ""));
                });
            } else {
                // Update existing quiz via PATCH
                var oAdminModel2 = this.getModel("admin");
                var oBinding = oAdminModel2.bindContext("/Quizzes('" + oQuiz.ID + "')");
                oBinding.requestObject().then(function () {
                    var oCtx = oBinding.getBoundContext();
                    oCtx.setProperty("title", oQuiz.title);
                    oCtx.setProperty("description", oQuiz.description);
                    oCtx.setProperty("category", oQuiz.category);
                    oCtx.setProperty("difficulty", oQuiz.difficulty);
                    oCtx.setProperty("timeLimitMinutes", parseInt(oQuiz.timeLimitMinutes) || null);
                    oCtx.setProperty("passingScorePct", parseFloat(oQuiz.passingScorePct) || 60);
                    oCtx.setProperty("attemptsAllowed", parseInt(oQuiz.attemptsAllowed) || 1);
                    return oAdminModel2.submitBatch("$auto");
                }).then(function () {
                    MessageToast.show(this.getResourceBundle().getText("quizSaved"));
                    oEditorModel.setProperty("/busy", false);
                }.bind(this)).catch(function () {
                    oEditorModel.setProperty("/busy", false);
                    MessageBox.error("Failed to save quiz.");
                });
            }
        },

        onPublish: function () {
            var oQuiz = this.getModel("editorView").getProperty("/quiz");
            this.callAction("admin", "publishQuiz", { quizId: oQuiz.ID })
                .then(function () {
                    MessageToast.show(this.getResourceBundle().getText("quizPublished"));
                    this._loadQuiz(oQuiz.ID);
                }.bind(this))
                .catch(function (oError) {
                    MessageBox.error(oError.message || "Publish failed.");
                });
        },

        // --- Question CRUD ---

        onAddQuestion: function () {
            var oEditorModel = this.getModel("editorView");
            oEditorModel.setProperty("/dialogTitle", this.getResourceBundle().getText("addQuestion"));
            oEditorModel.setProperty("/editQuestion", {
                questionText: "",
                questionType: "mcq_single",
                points: 1,
                orderIndex: (oEditorModel.getProperty("/questions") || []).length + 1,
                explanation: "",
                options: [
                    { optionText: "", isCorrect: false },
                    { optionText: "", isCorrect: false }
                ],
                _isNew: true
            });
            this._openQuestionDialog();
        },

        onEditQuestion: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("editorView");
            var oQuestion = JSON.parse(JSON.stringify(oCtx.getObject()));
            oQuestion._isNew = false;

            var oEditorModel = this.getModel("editorView");
            oEditorModel.setProperty("/dialogTitle", this.getResourceBundle().getText("editQuestion"));
            oEditorModel.setProperty("/editQuestion", oQuestion);
            this._openQuestionDialog();
        },

        _openQuestionDialog: function () {
            if (!this._pQuestionDialog) {
                this._pQuestionDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "quiz.app.fragment.QuestionDialog",
                    controller: this
                }).then(function (oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }
            this._pQuestionDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onAddOption: function () {
            var oEditorModel = this.getModel("editorView");
            var aOptions = oEditorModel.getProperty("/editQuestion/options") || [];
            aOptions.push({ optionText: "", isCorrect: false });
            oEditorModel.setProperty("/editQuestion/options", aOptions);
        },

        onRemoveOption: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("editorView");
            var sPath = oCtx.getPath();
            var iIndex = parseInt(sPath.split("/").pop());
            var oEditorModel = this.getModel("editorView");
            var aOptions = oEditorModel.getProperty("/editQuestion/options");
            aOptions.splice(iIndex, 1);
            oEditorModel.setProperty("/editQuestion/options", aOptions);
        },

        onSaveQuestion: function () {
            var oEditorModel = this.getModel("editorView");
            var oQuestion = oEditorModel.getProperty("/editQuestion");

            if (!oQuestion.questionText) {
                MessageBox.warning("Please enter question text.");
                return;
            }

            var oAdminModel = this.getModel("admin");

            if (oQuestion._isNew) {
                var oQuiz = oEditorModel.getProperty("/quiz");
                var aVersions = oQuiz.versions || [];
                var oActiveVersion = aVersions.find(function (v) { return v.isActive; });
                if (!oActiveVersion) {
                    MessageBox.error("No active version found. Save the quiz first.");
                    return;
                }

                var oListBinding = oAdminModel.bindList("/Questions");
                oListBinding.create({
                    quizVersion_ID: oActiveVersion.ID,
                    tenantId: oQuiz.tenantId,
                    questionText: oQuestion.questionText,
                    questionType: oQuestion.questionType,
                    points: parseFloat(oQuestion.points) || 1,
                    orderIndex: parseInt(oQuestion.orderIndex) || 0,
                    explanation: oQuestion.explanation
                });
            }

            MessageToast.show(this.getResourceBundle().getText("questionSaved"));
            this._closeQuestionDialog();

            // Reload questions
            var sQuizId = oEditorModel.getProperty("/quiz/ID");
            if (sQuizId) {
                setTimeout(function () { this._loadQuiz(sQuizId); }.bind(this), 500);
            }
        },

        onCancelQuestion: function () {
            this._closeQuestionDialog();
        },

        _closeQuestionDialog: function () {
            this._pQuestionDialog.then(function (oDialog) {
                oDialog.close();
            });
        },

        onDeleteQuestion: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("editorView");
            var sQuestionId = oCtx.getProperty("ID");
            var oEditorModel = this.getModel("editorView");

            MessageBox.confirm(this.getResourceBundle().getText("deleteConfirm"), {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        var oAdminModel = this.getModel("admin");
                        var oBinding = oAdminModel.bindContext("/Questions('" + sQuestionId + "')");
                        oBinding.requestObject().then(function () {
                            return oBinding.getBoundContext().delete();
                        }).then(function () {
                            MessageToast.show(this.getResourceBundle().getText("questionDeleted"));
                            var sQuizId = oEditorModel.getProperty("/quiz/ID");
                            if (sQuizId) { this._loadQuiz(sQuizId); }
                        }.bind(this)).catch(function () {
                            MessageBox.error("Failed to delete question.");
                        });
                    }
                }.bind(this)
            });
        }
    });
});
