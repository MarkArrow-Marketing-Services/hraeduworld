import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import "../styles/GlobalProgress.css";

// compact: boolean prop. When true, render a smaller inline bar suitable for the navbar
// Also display completed/total when available from the API (progress endpoint returns { overallPercent, totalItems, completedItems })
const GlobalProgress = ({ compact = false }) => {
  const { auth } = useContext(AuthContext);
  const [percent, setPercent] = useState(0);
  const [totalItems, setTotalItems] = useState(null);
  const [completedItems, setCompletedItems] = useState(null);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/student/progress",
          {
            headers: { Authorization: `Bearer ${auth.token}` },
          }
        );

        const p = Number(res.data?.overallPercent ?? 0) || 0;
        let clamped = Number.isFinite(p)
          ? Math.max(0, Math.min(100, Math.round(p)))
          : 0;
        setPercent(clamped);

        if (typeof res.data?.totalItems === "number")
          setTotalItems(res.data.totalItems);
        else setTotalItems(null);
        if (typeof res.data?.completedItems === "number")
          setCompletedItems(res.data.completedItems);
        else setCompletedItems(null);
      } catch (err) {
        setPercent(0);
        setTotalItems(null);
        setCompletedItems(null);
      }
    };

    if (auth.token) fetchProgress();

    const interval = setInterval(() => {
      if (auth.token) fetchProgress();
    }, 15000);

    const onStorage = (e) => {
      if (e.key === "student-progress-updated" && auth.token) fetchProgress();
    };

    const onCustom = (e) => {
      const provided = e?.detail?.overallPercent;
      if (typeof provided === "number") {
        const p = Number(provided);
        const clamped = Number.isFinite(p)
          ? Math.max(0, Math.min(100, Math.round(p)))
          : 0;
        setPercent(clamped);
        // If custom event also provided completed/total, apply them
        if (typeof e.detail?.completedItems === "number")
          setCompletedItems(e.detail.completedItems);
        if (typeof e.detail?.totalItems === "number")
          setTotalItems(e.detail.totalItems);
        return;
      }
      if (auth.token) fetchProgress();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("student-progress-updated", onCustom);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("student-progress-updated", onCustom);
    };
  }, [auth.token]);

  // Render compact inline variant
  if (compact) {
    return (
      <div className="global-progress compact" title={`Progress: ${percent}%`}>
        <div className="progress-track compact">
          <div
            className="progress-fill compact"
            style={{ width: `${percent}%` }}
            aria-valuenow={percent}
            aria-valuemin="0"
            aria-valuemax="100"
            role="progressbar"
          />
        </div>
        <div className="progress-info compact">
          <span className="progress-percent compact">{percent}%</span>
          {typeof completedItems === "number" &&
          typeof totalItems === "number" ? (
            <span className="progress-fraction compact">
              {completedItems}/{totalItems}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  // Default full-sized variant
  return (
    <div className="global-progress">
      {/* Animated gradient progress bar */}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${percent}%` }}
          aria-valuenow={percent}
          aria-valuemin="0"
          aria-valuemax="100"
          role="progressbar"
        />
      </div>

      {/* Text label for percentage */}
      <div className="progress-info">
        <span className="progress-label">Overall Progress</span>
        <span className="progress-percent">{percent}%</span>
      </div>
    </div>
  );
};

export default GlobalProgress;
