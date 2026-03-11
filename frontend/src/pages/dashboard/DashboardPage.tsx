import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../utils/api";
import Layout from "../../components/Layout/Layout";
import type { ProjectDetails } from "../../types/Types";
import styles from "./DashboardPage.module.css";

const DashboardPage = () => {
    const [projects, setProjects] = useState<ProjectDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await apiClient("/projects");
                setProjects(data);
            } catch (error) {
                console.error("Failed to load projects:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleBoardClick = (projectId: string, boardId: string) => {
        navigate(`/projects/${projectId}/boards/${boardId}`);
    };

    if (loading) {
        return (
            <Layout>
                <div className={styles.loading}>Loading projects...</div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className = {styles.container}>
                <div className = {styles.headerSection}>
                    <h1 className = {styles.title}>Dashboard</h1>
                    <p className = {styles.subtitle}>Select a board to get started</p>
                </div>

                <div className = {styles.grid}>
                    {projects.map((project) => (
                        <div key={project.id} className={styles.projectCard}>
                            <div className={styles.projectHeader}>
                                <h2 className={styles.projectTitle}>{project.name}</h2>
                                <span className={styles.roleBadge}>
                                    {project.userRole.replace('PROJECT_', '')}
                                </span>
                            </div>

                            <div className={styles.boardSection}>
                                <h3 className={styles.sectionLabel}>Boards</h3>
                                <div className={styles.boardList}>
                                    {project.boards.map((board) => (
                                    <button
                                            key={board.id}
                                            className={styles.boardButton}
                                            onClick={() => handleBoardClick(project.id, board.id)}
                                        >
                                            <span className={styles.boardIcon}>📋</span>
                                            <span className={styles.boardName}>{board.name}</span>
                                        </button>
                                    ))}
                                    {project.boards.length === 0 && (
                                        <p className={styles.emptyText}>No boards in this project.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {projects.length === 0 && (
                    <div className={styles.emptyState}>
                        <p className={styles.emptyText}>You are not part of any projects yet.</p>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default DashboardPage;