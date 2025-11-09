import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import "../styles/AdminUnits.css";
import { toast } from "react-hot-toast";
import { FaTrashAlt } from "react-icons/fa";

const AdminUnits = () => {
  const { auth } = useContext(AuthContext);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [units, setUnits] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // videoItems/pdfItems are arrays of { name: string, file: File | null }
  const [videoItems, setVideoItems] = useState([{ name: "", file: null }]);
  const [pdfItems, setPdfItems] = useState([{ name: "", file: null }]);
  const [playing, setPlaying] = useState({ url: null, name: null });

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSubjects(selectedClass);
    } else {
      setSubjects([]);
      setSelectedSubject("");
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedSubject) {
      fetchUnits(selectedSubject);
    } else {
      setUnits([]);
    }
  }, [selectedSubject]);

  const fetchClasses = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/classes", {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setClasses(res.data);
      if (res.data.length > 0) setSelectedClass(res.data[0]._id);
    } catch (error) {
      toast.error("Failed to fetch classes");
    }
  };

  const fetchSubjects = async (classId) => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/subjects/${classId}`,
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
        `http://localhost:5000/api/units/${subjectId}`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );
      setUnits(res.data);
    } catch (error) {
      toast.error("Failed to fetch units");
    }
  };

  const deleteUnit = async (unitId) => {
    if (!window.confirm("Delete this unit?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/units/delete/${unitId}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      toast.success("Unit deleted");
      fetchUnits(selectedSubject);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete unit");
    }
  };

  const [editingUnitId, setEditingUnitId] = useState(null);
  const [editingUnitValues, setEditingUnitValues] = useState({
    title: "",
    description: "",
  });
  const [editingRemovals, setEditingRemovals] = useState({
    videos: [],
    pdfs: [],
  });
  const [editingRenames, setEditingRenames] = useState({
    videos: {},
    pdfs: {},
  });
  const startEditUnit = (u) => {
    setEditingUnitId(u._id);
    setEditingUnitValues({ title: u.title, description: u.description || "" });
    setEditingRemovals({ videos: [], pdfs: [] });
    setEditingRenames({ videos: {}, pdfs: {} });
    // prepare new file rows for adding while editing
    setVideoItems([{ name: "", file: null }]);
    setPdfItems([{ name: "", file: null }]);
  };
  const saveUnitEdit = async (id) => {
    try {
      // Validate required fields
      if (!editingUnitValues.title || editingUnitValues.title.trim() === "") {
        toast.error("Title is required");
        return;
      }

      // If there are files selected to upload during edit, use multipart
      const formData = new FormData();
      formData.append("title", editingUnitValues.title.trim());
      formData.append("description", editingUnitValues.description || "");

      // append any newly chosen files for update
      let hasVideos = false;
      for (let i = 0; i < videoItems.length; i++) {
        const it = videoItems[i];
        if (it && it.file) {
          formData.append("videos", it.file);
          formData.append("videoNames", it.name || it.file.name);
          hasVideos = true;
        }
      }

      for (let i = 0; i < pdfItems.length; i++) {
        const it = pdfItems[i];
        if (it && it.file) {
          formData.append("pdfs", it.file);
          formData.append("pdfNames", it.name || it.file.name);
        }
      }

      // include removals and renames
      if (editingRemovals.videos && editingRemovals.videos.length > 0) {
        editingRemovals.videos.forEach((u) =>
          formData.append("removeVideoUrls", u)
        );
      }

      if (editingRemovals.pdfs && editingRemovals.pdfs.length > 0) {
        editingRemovals.pdfs.forEach((u) =>
          formData.append("removePdfUrls", u)
        );
      }

      if (Object.keys(editingRenames.videos || {}).length > 0) {
        formData.append(
          "renameVideoNames",
          JSON.stringify(editingRenames.videos)
        );
      }

      if (Object.keys(editingRenames.pdfs || {}).length > 0) {
        formData.append("renamePdfNames", JSON.stringify(editingRenames.pdfs));
      }

      const response = await axios.put(
        `http://localhost:5000/api/units/update/${id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );

      if (response.data && response.data.unit) {
        toast.success("Unit updated successfully");
        setEditingUnitId(null);
        setVideoItems([{ name: "", file: null }]);
        setPdfItems([{ name: "", file: null }]);
        fetchUnits(selectedSubject);
      } else {
        toast.error("Update response missing unit data");
      }
    } catch (error) {
      console.error(
        "Unit update error:",
        error.response?.data || error.message
      );
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to update unit";
      toast.error(errorMessage);
    }
  };

  const markRemoveResource = (type, url) => {
    setEditingRemovals((r) => ({ ...r, [type]: [...r[type], url] }));
  };

  const setRenameResource = (type, url, newName) => {
    setEditingRenames((r) => ({
      ...r,
      [type]: { ...r[type], [url]: newName },
    }));
  };

  const updateVideoFile = (index, file) => {
    setVideoItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...(copy[index] || {}), file };
      return copy;
    });
  };

  const updateVideoName = (index, name) => {
    setVideoItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...(copy[index] || {}), name };
      return copy;
    });
  };

  const addVideoRow = () =>
    setVideoItems((p) => [...p, { name: "", file: null }]);

  const updatePdfFile = (index, file) => {
    setPdfItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...(copy[index] || {}), file };
      return copy;
    });
  };

  const updatePdfName = (index, name) => {
    setPdfItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...(copy[index] || {}), name };
      return copy;
    });
  };

  const addPdfRow = () => setPdfItems((p) => [...p, { name: "", file: null }]);

  const removeVideoRow = (index) => {
    setVideoItems((prev) => prev.filter((_, i) => i !== index));
  };

  const removePdfRow = (index) => {
    setPdfItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddUnit = async (e) => {
    e.preventDefault();
    if (!selectedSubject) {
      toast.error("Select a subject first");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("subjectId", selectedSubject);
    // append video items (file + name) in order
    for (let i = 0; i < videoItems.length; i++) {
      const it = videoItems[i];
      if (it && it.file) {
        formData.append("videos", it.file);
        formData.append(
          "videoNames",
          it.name || it.file.name || `Video ${i + 1}`
        );
      }
    }
    for (let i = 0; i < pdfItems.length; i++) {
      const it = pdfItems[i];
      if (it && it.file) {
        formData.append("pdfs", it.file);
        formData.append("pdfNames", it.name || it.file.name || `PDF ${i + 1}`);
      }
    }

    try {
      await axios.post("http://localhost:5000/api/units", formData, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
      toast.success("Unit added successfully");
      setTitle("");
      setDescription("");
      setVideoItems([{ name: "", file: null }]);
      setPdfItems([{ name: "", file: null }]);
      fetchUnits(selectedSubject);
      // Clear file inputs
      // Clear any file inputs in the form
      document.querySelectorAll('input[type="file"]').forEach((el) => {
        try {
          el.value = "";
        } catch (e) {
          // ignore
        }
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add unit");
    }
  };

  // PDF/video helpers already defined: addVideoRow, updateVideoFile, updateVideoName, addPdfRow, updatePdfFile, updatePdfName

  return (
    <div className="admin-units-container card">
      <h1>Manage Units</h1>

      <div className="select-group">
        <div className="select-item">
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
        </div>

        <div className="select-item">
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
        </div>
      </div>

      <form className="add-unit-form" onSubmit={handleAddUnit}>
        <input
          type="text"
          placeholder="Unit Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows="3"
        />
        <label>Videos:</label>
        {videoItems.map((it, idx) => (
          <div key={idx} className="resource-row">
            <input
              type="text"
              placeholder={`Topic / display name`}
              value={it.name}
              onChange={(e) => updateVideoName(idx, e.target.value)}
              className="resource-name"
            />
            <input
              id={"videoInput" + idx}
              type="file"
              accept="video/*"
              onChange={(e) => updateVideoFile(idx, e.target.files[0])}
            />
            {idx === videoItems.length - 1 && (
              <button
                type="button"
                onClick={addVideoRow}
                className="btn btn-primary add-inline-btn"
              >
                + Add video
              </button>
            )}
          </div>
        ))}
        <label>PDFs:</label>
        {pdfItems.map((it, idx) => (
          <div key={idx} className="resource-row">
            <input
              type="text"
              placeholder="Document name"
              value={it.name}
              onChange={(e) => updatePdfName(idx, e.target.value)}
              className="resource-name"
            />
            <input
              id={"pdfInput" + idx}
              type="file"
              accept="application/pdf"
              onChange={(e) => updatePdfFile(idx, e.target.files[0])}
            />
            {idx === pdfItems.length - 1 && (
              <button
                type="button"
                onClick={addPdfRow}
                className="btn btn-primary add-inline-btn"
              >
                + Add PDF
              </button>
            )}
          </div>
        ))}
        <button type="submit" className="btn btn-success">
          Add Unit
        </button>
      </form>

      <div className="unit-list">
        {units.length === 0 ? (
          <p>No units available.</p>
        ) : (
          units.map((unit) => (
            <div key={unit._id} className="unit-card card">
              {editingUnitId === unit._id ? (
                <div>
                  <input
                    value={editingUnitValues.title}
                    onChange={(e) =>
                      setEditingUnitValues((v) => ({
                        ...v,
                        title: e.target.value,
                      }))
                    }
                  />
                  <textarea
                    value={editingUnitValues.description}
                    onChange={(e) =>
                      setEditingUnitValues((v) => ({
                        ...v,
                        description: e.target.value,
                      }))
                    }
                  />
                  <div className="mt-12">
                    <strong>Add new videos/PDFs:</strong>
                    {videoItems.map((it, idx) => (
                      <div key={idx} className="resource-row">
                        <input
                          type="text"
                          placeholder={`Topic / display name`}
                          value={it.name}
                          onChange={(e) => updateVideoName(idx, e.target.value)}
                          className="resource-name"
                        />
                        <input
                          id={`editVideoInput${idx}`}
                          type="file"
                          accept="video/*"
                          onChange={(e) =>
                            updateVideoFile(idx, e.target.files[0])
                          }
                        />
                        {idx === videoItems.length - 1 && (
                          <button
                            type="button"
                            onClick={addVideoRow}
                            className="btn btn-primary add-inline-btn"
                          >
                            + Add video
                          </button>
                        )}
                      </div>
                    ))}

                    {pdfItems.map((it, idx) => (
                      <div key={idx} className="resource-row">
                        <input
                          type="text"
                          placeholder={`Document name`}
                          value={it.name}
                          onChange={(e) => updatePdfName(idx, e.target.value)}
                          className="resource-name"
                        />
                        <input
                          id={`editPdfInput${idx}`}
                          type="file"
                          accept="application/pdf"
                          onChange={(e) =>
                            updatePdfFile(idx, e.target.files[0])
                          }
                        />
                        {idx === pdfItems.length - 1 && (
                          <button
                            type="button"
                            onClick={addPdfRow}
                            className="btn btn-primary add-inline-btn"
                          >
                            + Add PDF
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Existing resources - allow rename and mark for deletion when editing */}
                  <div className="mt-12">
                    <strong>Existing Videos:</strong>
                    <ul>
                      {unit.resources?.videos?.map((video, index) => {
                        const marked = editingRemovals.videos.includes(
                          video.url
                        );
                        return (
                          <li
                            key={index}
                            className={`resource-item ${
                              marked ? "marked" : ""
                            }`}
                          >
                            <div className="resource-row">
                              <input
                                value={
                                  editingRenames.videos[video.url] ?? video.name
                                }
                                onChange={(e) =>
                                  setRenameResource(
                                    "videos",
                                    video.url,
                                    e.target.value
                                  )
                                }
                                className="resource-name"
                              />
                              <button
                                onClick={() =>
                                  markRemoveResource("videos", video.url)
                                }
                                disabled={marked}
                                className="delete-button"
                              >
                                {marked ? "Marked for delete" : <FaTrashAlt />}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    <strong>Existing PDFs:</strong>
                    <ul>
                      {unit.resources?.pdfs?.map((pdf, index) => {
                        const marked = editingRemovals.pdfs.includes(pdf.url);
                        return (
                          <li
                            key={index}
                            className={`resource-item ${
                              marked ? "marked" : ""
                            }`}
                          >
                            <div className="resource-row">
                              <input
                                value={editingRenames.pdfs[pdf.url] ?? pdf.name}
                                onChange={(e) =>
                                  setRenameResource(
                                    "pdfs",
                                    pdf.url,
                                    e.target.value
                                  )
                                }
                                className="resource-name"
                              />
                              <button
                                onClick={() =>
                                  markRemoveResource("pdfs", pdf.url)
                                }
                                disabled={marked}
                                className="delete-button"
                              >
                                {marked ? "Marked for delete" : <FaTrashAlt />}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div>
                    <button
                      onClick={() => saveUnitEdit(unit._id)}
                      className="save-button"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingUnitId(null)}
                      className="cancel-button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3>{unit.title}</h3>
                  <p>{unit.description || "No description"}</p>
                  <div className="unit-resources">
                    <strong>Videos:</strong>
                    <ul>
                      {unit.resources?.videos?.map((video, index) => (
                        <li key={index} className="unit-resource-item">
                          <div>
                            <strong
                              className="resource-link"
                              onClick={() =>
                                setPlaying({
                                  url: `http://localhost:5000${video.url}`,
                                  name: video.name,
                                })
                              }
                            >
                              {video.name || `Video ${index + 1}`}
                            </strong>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <strong>PDFs:</strong>
                    <ul>
                      {unit.resources?.pdfs?.map((pdf, index) => (
                        <li key={index} className="unit-resource-item">
                          <div>
                            <strong>{pdf.name || `PDF ${index + 1}`}</strong>
                          </div>
                          <div>
                            <a
                              href={`http://localhost:5000${pdf.url}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open PDF
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-8">
                    <button
                      onClick={() => startEditUnit(unit)}
                      className="btn btn-edit"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteUnit(unit._id)}
                      className="btn btn-delete ml-8"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {/* Modal player */}
      {playing.url && (
        <div
          className="player-backdrop"
          onClick={() => setPlaying({ url: null, name: null })}
        >
          <div className="player-box" onClick={(e) => e.stopPropagation()}>
            <h4>{playing.name}</h4>
            <video width={640} height={360} controls>
              <source src={playing.url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div style={{ textAlign: "right", marginTop: 8 }}>
              <button
                onClick={() => setPlaying({ url: null, name: null })}
                className="cancel-button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUnits;
