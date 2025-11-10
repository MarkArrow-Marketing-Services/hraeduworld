import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { useLocation } from "react-router-dom";
import "../styles/StudentQuiz.css";

const StudentQuiz = () => {
  const { auth } = useContext(AuthContext);
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [score, setScore] = useState(null);

  useEffect(() => {
    // Fetch units - could be fetched via enrolled classes > subjects > units as in Unit page or separately
    // Simplify here by fetching units for demonstration
    const q = new URLSearchParams(window.location.search);
    const unitIdFromQuery = q.get("unitId");
    if (unitIdFromQuery) {
      // If unit id provided, fetch quiz list for that unit and prefer the provided quizId
      fetchQuiz(unitIdFromQuery, q.get("quizId") || null);
      // Load units but avoid re-fetching the quiz for the first unit to prevent overwrite
      fetchUnits(unitIdFromQuery, true);
    } else {
      fetchUnits();
    }
  }, []);

  const fetchUnits = async (preferUnitId = null, skipFetchQuiz = false) => {
    try {
      const resClasses = await axios.get(
        "https://hraeduworld-backend.onrender.com/api/student/classes",
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      if (resClasses.data.length === 0) {
        toast.error("No enrolled classes");
        return;
      }
      // Simplify: fetch units for first class's first subject
      const classId = resClasses.data[0]._id;
      const resSubjects = await axios.get(
        `https://hraeduworld-backend.onrender.com/api/subjects/${classId}`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      if (resSubjects.data.length === 0) {
        toast.error("No subjects in class");
        return;
      }
      const subjectId = resSubjects.data[0]._id;
      const resUnits = await axios.get(
        `https://hraeduworld-backend.onrender.com/api/units/${subjectId}`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      setUnits(resUnits.data);
      if (resUnits.data.length > 0) {
        // If caller provided a preferred unit id, try to select that one.
        if (preferUnitId) {
          const found = resUnits.data.find((u) => u._id === preferUnitId);
          if (found) {
            setSelectedUnit(found._id);
            if (!skipFetchQuiz) fetchQuiz(found._id);
            return;
          }
        }
        // Default behavior: select the first unit and fetch its quiz (unless skipFetchQuiz)
        setSelectedUnit(resUnits.data[0]._id);
        if (!skipFetchQuiz) fetchQuiz(resUnits.data[0]._id);
      }
    } catch (error) {
      toast.error("Failed to fetch units");
    }
  };

  const fetchQuiz = async (unitId, preferQuizId = null) => {
    try {
      const res = await axios.get(
        `https://hraeduworld-backend.onrender.com/api/quizzes/${unitId}`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      // Server returns an array (possibly multiple quizzes for a unit). Use the latest if array, or the object directly.
      const data = res.data;
      let selected = null;
      if (Array.isArray(data)) {
        if (preferQuizId)
          selected =
            data.find((d) => d._id === preferQuizId) || data[0] || null;
        else selected = data.length > 0 ? data[0] : null;
      } else {
        selected = data || null;
      }
      setQuiz(selected);
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setScore(null);
    } catch (error) {
      toast.error("Failed to fetch quiz");
      setQuiz(null);
    }
  };

  const handleAnswerSelect = (option) => {
    setAnswers((prev) => {
      const updated = [...prev];
      updated[currentQuestionIndex] = option;
      return updated;
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    let calculatedScore = 0;
    quiz.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        calculatedScore++;
      }
    });
    setScore(calculatedScore);

    try {
      await axios.post(
        "https://hraeduworld-backend.onrender.com/api/student/quiz-progress",
        { quizId: quiz._id, score: calculatedScore },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      // Notify other components/tabs that student progress changed (same pattern as resource progress)
      try {
        const ev = new CustomEvent("student-progress-updated", {});
        window.dispatchEvent(ev);
        try {
          localStorage.setItem("student-progress-updated", String(Date.now()));
        } catch (e) {}
      } catch (e) {}
      toast.success("Quiz submitted and score recorded");
    } catch (err) {
      toast.error("Failed to save quiz progress");
    }
  };

  if (!quiz) return <p>Loading or no quiz available...</p>;

  // Defensive: quiz.questions may be undefined or empty
  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    return <p>No questions available for this quiz.</p>;
  }

  const question = quiz.questions[currentQuestionIndex];

  const unitTitle = units.find((u) => u._id === selectedUnit)?.title;
  const params = new URLSearchParams(window.location.search);
  const unitIdFromQuery = params.get("unitId");

  return (
    <div className="student-quiz-container">
      <h1>{quiz?.name || `Quiz for ${unitTitle || "Unit"}`}</h1>
      {/* If opened via unitId query param, don't show the selector; show read-only unit title */}
      {unitIdFromQuery ? (
        <div style={{ marginBottom: 12 }}>
          <strong>Unit:</strong> {unitTitle || "(loading...)"}
        </div>
      ) : (
        <label>
          Select Unit:
          <select
            value={selectedUnit}
            onChange={(e) => {
              setSelectedUnit(e.target.value);
              fetchQuiz(e.target.value);
              setScore(null);
              setAnswers([]);
            }}
          >
            {units.map((unit) => (
              <option key={unit._id} value={unit._id}>
                {unit.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="question-section">
        <h3>
          Question {currentQuestionIndex + 1} of {quiz.questions.length}
        </h3>
        <p className="question-text">{question.questionText}</p>
        <div className="options">
          {question.options.map((option, idx) => {
            const optId = `q${currentQuestionIndex}_opt${idx}`;
            const isChecked = answers[currentQuestionIndex] === option;
            const letter = String.fromCharCode(65 + idx); // A, B, C...
            return (
              <label
                className={`option-card ${isChecked ? "checked" : ""}`}
                key={idx}
                htmlFor={optId}
              >
                <input
                  id={optId}
                  type="radio"
                  name={`question-${currentQuestionIndex}`}
                  checked={isChecked}
                  onChange={() => handleAnswerSelect(option)}
                />
                <div className="option-bullet">{letter}</div>
                <div className="option-content">{option}</div>
              </label>
            );
          })}
        </div>
        <div className="navigation-buttons">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </button>
          {currentQuestionIndex < quiz.questions.length - 1 ? (
            <button onClick={handleNext}>Next</button>
          ) : (
            <button onClick={handleSubmit}>Submit Quiz</button>
          )}
        </div>
      </div>
      {score !== null && (
        <p>
          Your Score: {score} / {quiz.questions.length}
        </p>
      )}
      {score !== null && (
        <div className="mt-8">
          <button
            onClick={() => {
              setAnswers([]);
              setScore(null);
              setCurrentQuestionIndex(0);
              toast("You can retake the quiz now");
            }}
            className="ml-8"
          >
            Retake Quiz
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentQuiz;
