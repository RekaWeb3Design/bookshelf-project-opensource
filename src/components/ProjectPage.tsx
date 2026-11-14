import type {Project} from '../data/projects'

const STATUS_LABEL = {live: 'Live', wip: 'In progress', idea: 'Idea'}

type ProjectPageProps = {project: Project, onClose: () => void}

// Right-hand page of the open book: plain DOM, so the text is real and selectable.
export const ProjectPage = ({project, onClose}: ProjectPageProps) => (
  <article className="project-page__body">
    <button className="project-page__back" onClick={onClose}>← Back to the shelf</button>
    <h1>{project.title}</h1>
    <p className="project-page__tagline">{project.tagline}</p>
    <p>{project.description}</p>
    <ul className="project-page__chips">
      {project.stack.map((tech) => <li key={tech}>{tech}</li>)}
    </ul>
    <p className="project-page__status">
      <span className={`project-page__dot project-page__dot--${project.status}`} />
      {STATUS_LABEL[project.status]} · {project.year}
    </p>
    {project.links && (
      <ul className="project-page__links">
        {project.links.map((link) => (
          <li key={link.label}>
            <a href={link.href} target="_blank" rel="noreferrer">{link.label} ↗</a>
          </li>
        ))}
      </ul>
    )}
  </article>
)
