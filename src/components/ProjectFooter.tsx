interface ProjectFooterProps {
    totalProjects: number;
    isSearching: boolean;
}

export default function ProjectFooter({
    totalProjects,
    isSearching,
}: ProjectFooterProps) {
    return (
        <footer className="mt-20 pt-8 border-t text-center" style={{ borderColor: 'var(--card-border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-color)', opacity: 0.7 }}>
                {totalProjects > 0 &&
                    `${totalProjects} project${totalProjects === 1 ? "" : "s"} available!`}{" "}
                Visit my{" "}
                <a
                    href="https://cytronicoder.com/resume"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline transition-opacity hover:opacity-80"
                    style={{ color: 'var(--primary-color)' }}
                >
                    resume
                </a>{" "}
                to see all my work.
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-color)', opacity: 0.7 }}>
                Check out my{" "}
                <a
                    href="https://github.com/cytronicoder"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline transition-opacity hover:opacity-80"
                    style={{ color: 'var(--primary-color)' }}
                >
                    GitHub
                </a>{" "}
                for more projects and{" "}
                <a
                    href="https://cytronicoder.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline transition-opacity hover:opacity-80"
                    style={{ color: 'var(--primary-color)' }}
                >
                    portfolio
                </a>{" "}
                for more information.
            </p>
        </footer>
    );
}
