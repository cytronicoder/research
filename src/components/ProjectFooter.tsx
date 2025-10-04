interface ProjectFooterProps {
    totalProjects: number;
    isSearching: boolean;
}

export default function ProjectFooter({
    totalProjects,
    isSearching,
}: ProjectFooterProps) {
    return (
        <footer className="mt-20 pt-8 border-t border-gray-200 dark:border-gray-800 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-500">
                {totalProjects > 0 &&
                    !isSearching &&
                    `${totalProjects} project${totalProjects === 1 ? "" : "s"} available!`}{" "}
                Visit my{" "}
                <a
                    href="https://cytronicoder.com/resume"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                    resume
                </a>{" "}
                to see all my work.
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                Check out my{" "}
                <a
                    href="https://github.com/cytronicoder"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                    GitHub
                </a>{" "}
                for more projects and{" "}
                <a
                    href="https://cytronicoder.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                    portfolio
                </a>{" "}
                for more information.
            </p>
        </footer>
    );
}
