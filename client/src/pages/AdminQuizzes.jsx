import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import "../styles/theme.css";
import "../styles/AdminQuizzes.css";
import { toast } from "react-hot-toast";

const AdminQuizzes = () => {
  const { auth } = useContext(AuthContext);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [quizName, setQuizName] = useState("");
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [editingQuizName, setEditingQuizName] = useState("");
  // Separate states for create-form questions and edit-form questions
  const [createQuestions, setCreateQuestions] = useState([
    { questionText: "", options: ["", "", "", ""], correctAnswer: "" },
  ]);
  const [editQuestions, setEditQuestions] = useState([
    { questionText: "", options: ["", "", "", ""], correctAnswer: "" },
  ]);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSubjects(selectedClass);
    } else {
      setSubjects([]);
    }
    setSelectedSubject("");
  }, [selectedClass]);

  useEffect(() => {
    if (selectedSubject) {
      fetchUnits(selectedSubject);
    } else {
      setUnits([]);
    }
    setSelectedUnit("");
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedUnit) fetchQuizzes(selectedUnit);
    else setQuizzes([]);
  }, [selectedUnit]);

  const fetchClasses = async () => {
    try {
      const res = await axios.get(
        "https://hraeduworld-backend.onrender.com/api/classes",
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      setClasses(res.data);
      if (res.data.length > 0) setSelectedClass(res.data[0]._id);
    } catch (error) {
      toast.error("Failed to fetch classes");
    }
  };

  const fetchSubjects = async (classId) => {
    try {
      const res = await axios.get(
        `https://hraeduworld-backend.onrender.com/api/subjects/${classId}`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      setSubjects(res.data);
      if (res.data.length > 0) setSelectedSubject(res.data[0]._id);
    } catch (error) {
      toast.error("Failed to fetch subjects");
    }
  };

  const fetchUnits = async (subjectId) => {
    try {
      const res = await axios.get(
        `https://hraeduworld-backend.onrender.com/api/units/${subjectId}`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      setUnits(res.data);
      if (res.data.length > 0) setSelectedUnit(res.data[0]._id);
    } catch (error) {
      toast.error("Failed to fetch units");
    }
  };

  const fetchQuizzes = async (unitId) => {
    try {
      const res = await axios.get(
        `https://hraeduworld-backend.onrender.com/api/quizzes/${unitId}`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      if (!res.data) setQuizzes([]);
      else if (Array.isArray(res.data)) setQuizzes(res.data);
      else setQuizzes([res.data]);
    } catch (error) {
      console.error(
        "fetchQuizzes error",
        error.response?.data || error.message
      );
      setQuizzes([]);
    }
  };

  const handleCreateQuestionChange = (index, field, value) => {
    const updatedQuestions = [...createQuestions];
    if (field === "questionText" || field === "correctAnswer") {
      updatedQuestions[index][field] = value;
    } else {
      updatedQuestions[index].options[field] = value;
    }
    setCreateQuestions(updatedQuestions);
  };

  const handleEditQuestionChange = (index, field, value) => {
    const updatedQuestions = [...editQuestions];
    if (field === "questionText" || field === "correctAnswer") {
      updatedQuestions[index][field] = value;
    } else {
      updatedQuestions[index].options[field] = value;
    }
    setEditQuestions(updatedQuestions);
  };

  const addCreateQuestion = () => {
    setCreateQuestions((prev) => [
      ...prev,
      { questionText: "", options: ["", "", "", ""], correctAnswer: "" },
    ]);
  };

  const addEditQuestion = () => {
    setEditQuestions((prev) => [
      ...prev,
      { questionText: "", options: ["", "", "", ""], correctAnswer: "" },
    ]);
  };

  const removeCreateQuestion = (index) => {
    setCreateQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const removeEditQuestion = (index) => {
    setEditQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUnit) {
      toast.error("Select a unit first");
      return;
    }
    try {
      await axios.post(
        "https://hraeduworld-backend.onrender.com/api/quizzes",
        { unitId: selectedUnit, questions: createQuestions, name: quizName },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      toast.success("Quiz created successfully");
      if (selectedUnit) fetchQuizzes(selectedUnit);
      setCreateQuestions([
        { questionText: "", options: ["", "", "", ""], correctAnswer: "" },
      ]);
      setQuizName("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create quiz");
    }
  };

  return (
    <div className="admin-quizzes-container card">
      <h1>Manage Quizzes</h1>

      <div className="select-group">
        <label>Select Class:</label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          {classes.map((cls) => (
            <option key={cls._id} value={cls._id}>
              {cls.name}
            </option>
          ))}
        </select>

        <label>Select Subject:</label>
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
        >
          {subjects.map((subj) => (
            <option key={subj._id} value={subj._id}>
              {subj.name}
            </option>
          ))}
        </select>

        <label>Select Unit:</label>
        <select
          value={selectedUnit}
          onChange={(e) => setSelectedUnit(e.target.value)}
        >
          {units.map((unit) => (
            <option key={unit._id} value={unit._id}>
              {unit.title}
            </option>
          ))}
        </select>
      </div>

      <form className="quiz-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Quiz Name (e.g., Chapter 1 Test)"
          value={quizName}
          onChange={(e) => setQuizName(e.target.value)}
          required
        />
        {createQuestions.map((q, i) => (
          <div key={i} className="question-block">
            <input
              type="text"
              placeholder="Question Text"
              value={q.questionText}
              onChange={(e) =>
                handleCreateQuestionChange(i, "questionText", e.target.value)
              }
              required
            />
            <div className="options-group">
              {q.options.map((option, idx) => (
                <input
                  key={idx}
                  type="text"
                  placeholder={`Option ${idx + 1}`}
                  value={option}
                  onChange={(e) =>
                    handleCreateQuestionChange(i, idx, e.target.value)
                  }
                  required
                />
              ))}
            </div>
            <input
              type="text"
              placeholder="Correct Answer"
              value={q.correctAnswer}
              onChange={(e) =>
                handleCreateQuestionChange(i, "correctAnswer", e.target.value)
              }
              required
            />
            <button
              type="button"
              className="btn btn-quiz-remove"
              onClick={() => removeCreateQuestion(i)}
            >
              Remove Question
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-quiz-add"
          onClick={addCreateQuestion}
        >
          Add Question
        </button>
        <button type="submit" className="btn btn-quiz-save">
          Create Quiz
        </button>
      </form>

      <div style={{ marginTop: 24 }}>
        <h3>Quizzes for selected unit</h3>
        {quizzes.length === 0 ? (
          <p>No quizzes for this unit yet.</p>
        ) : (
          <ul>
            {quizzes
              .filter((q) => q._id !== editingQuizId)
              .map((q) => (
                <li key={q._id} className="quiz-item">
                  <div className="quiz-item-main">
                    <strong>{q.name || `Quiz ${q._id}`}</strong>
                    <span style={{ marginLeft: 8 }}>
                      — {q.questions?.length || 0} questions
                    </span>
                  </div>

                  <div className="quiz-item-actions">
                    <button
                      className="btn btn-edit-quiz"
                      onClick={() => {
                        setEditingQuizId(q._id);
                        setEditingQuizName(q.name || "");
                        setEditQuestions(
                          q.questions && q.questions.length
                            ? q.questions
                            : [
                                {
                                  questionText: "",
                                  options: ["", "", "", ""],
                                  correctAnswer: "",
                                },
                              ]
                        );
                      }}
                    >
                      Edit
                    </button>

                    <button
                      className="btn btn-delete-quiz"
                      onClick={async () => {
                        if (!confirm("Delete this quiz?")) return;
                        try {
                          await axios.delete(
                            `https://hraeduworld-backend.onrender.com/api/quizzes/${q._id}`,
                            {
                              headers: {
                                Authorization: `Bearer ${auth.token}`,
                              },
                            }
                          );
                          toast.success("Quiz deleted");
                          if (selectedUnit) fetchQuizzes(selectedUnit);
                        } catch (err) {
                          toast.error(
                            err.response?.data?.message ||
                              "Failed to delete quiz"
                          );
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      {editingQuizId && (
        <div style={{ marginTop: 24 }}>
          <h3>Edit Quiz</h3>
          <input
            type="text"
            value={editingQuizName}
            onChange={(e) => setEditingQuizName(e.target.value)}
            placeholder="Quiz name"
          />
          {editQuestions.map((q, i) => (
            <div key={i} className="question-block">
              <input
                type="text"
                placeholder="Question Text"
                value={q.questionText}
                onChange={(e) =>
                  handleEditQuestionChange(i, "questionText", e.target.value)
                }
                required
              />
              <div className="options-group">
                {q.options.map((option, idx) => (
                  <input
                    key={idx}
                    type="text"
                    placeholder={`Option ${idx + 1}`}
                    value={option}
                    onChange={(e) =>
                      handleEditQuestionChange(i, idx, e.target.value)
                    }
                    required
                  />
                ))}
              </div>
              <input
                type="text"
                placeholder="Correct Answer"
                value={q.correctAnswer}
                onChange={(e) =>
                  handleEditQuestionChange(i, "correctAnswer", e.target.value)
                }
                required
              />
              <button
                type="button"
                className="btn btn-quiz-remove"
                onClick={() => removeEditQuestion(i)}
              >
                Remove Question
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-quiz-add"
            onClick={addEditQuestion}
          >
            Add Question
          </button>
          <button
            onClick={async () => {
              try {
                await axios.put(
                  `https://hraeduworld-backend.onrender.com/api/quizzes/${editingQuizId}`,
                  { name: editingQuizName, questions: editQuestions },
                  { headers: { Authorization: `Bearer ${auth.token}` } }
                );
                toast.success("Quiz updated");
                setEditingQuizId(null);
                setEditingQuizName("");
                setEditQuestions([
                  {
                    questionText: "",
                    options: ["", "", "", ""],
                    correctAnswer: "",
                  },
                ]);
                if (selectedUnit) fetchQuizzes(selectedUnit);
              } catch (err) {
                toast.error(
                  err.response?.data?.message || "Failed to update quiz"
                );
              }
            }}
            className="btn btn-quiz-save"
          >
            Save Changes
          </button>
          <button
            className="btn btn-quiz-cancel"
            onClick={() => {
              setEditingQuizId(null);
              setEditingQuizName("");
              setEditQuestions([
                {
                  questionText: "",
                  options: ["", "", "", ""],
                  correctAnswer: "",
                },
              ]);
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminQuizzes;
