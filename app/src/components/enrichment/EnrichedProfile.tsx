"use client";

interface EnrichedProfileProps {
  data: Record<string, unknown>;
  recordType: "company" | "person";
}

export function EnrichedProfile({ data, recordType }: EnrichedProfileProps) {
  if (recordType === "person") {
    return <PersonProfile data={data} />;
  }
  return <CompanyProfile data={data} />;
}

function PersonProfile({ data }: { data: Record<string, unknown> }) {
  const experience = data.experience as
    | Array<{ title?: string; company?: string; duration?: string }>
    | undefined;
  const education = data.education as string[] | undefined;
  const skills = data.skills as string[] | undefined;

  return (
    <div className="space-y-4">
      {!!data.headline && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Headline</h3>
          <p className="mt-1 text-sm text-gray-900 dark:text-white">
            {data.headline as string}
          </p>
        </div>
      )}

      {!!data.currentRole && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Current Role</h3>
          <p className="mt-1 text-sm text-gray-900 dark:text-white">
            {data.currentRole as string}
            {data.company ? ` at ${data.company as string}` : null}
          </p>
        </div>
      )}

      {!!data.summary && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Summary</h3>
          <p className="mt-1 text-sm text-gray-900 dark:text-white">
            {data.summary as string}
          </p>
        </div>
      )}

      {!!data.location && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Location</h3>
          <p className="mt-1 text-sm text-gray-900 dark:text-white">
            {data.location as string}
          </p>
        </div>
      )}

      {experience && experience.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Experience</h3>
          <ul className="mt-1 space-y-1">
            {experience.map((exp, i) => (
              <li key={i} className="text-sm text-gray-900 dark:text-white">
                <span className="font-medium">{exp.title}</span>
                {exp.company && (
                  <span className="text-gray-500"> at {exp.company}</span>
                )}
                {exp.duration && (
                  <span className="text-gray-400"> ({exp.duration})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {education && education.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Education</h3>
          <ul className="mt-1 space-y-0.5">
            {education.map((edu, i) => (
              <li key={i} className="text-sm text-gray-900 dark:text-white">
                {edu}
              </li>
            ))}
          </ul>
        </div>
      )}

      {skills && skills.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Skills</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {skills.map((skill, i) => (
              <span
                key={i}
                className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CompanyProfile({ data }: { data: Record<string, unknown> }) {
  const products = data.products as string[] | undefined;
  const keyMetrics = data.keyMetrics as string[] | undefined;

  return (
    <div className="space-y-4">
      {!!data.description && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Description</h3>
          <p className="mt-1 text-sm text-gray-900 dark:text-white">
            {data.description as string}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {!!data.industry && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Industry</h3>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">
              {data.industry as string}
            </p>
          </div>
        )}
        {!!data.teamSize && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Team Size</h3>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">
              {data.teamSize as string}
            </p>
          </div>
        )}
        {!!data.fundingStage && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">
              Funding Stage
            </h3>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">
              {data.fundingStage as string}
            </p>
          </div>
        )}
        {!!data.headquarters && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">
              Headquarters
            </h3>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">
              {data.headquarters as string}
            </p>
          </div>
        )}
        {!!data.yearFounded && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Founded</h3>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">
              {data.yearFounded as string}
            </p>
          </div>
        )}
      </div>

      {products && products.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Products</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {products.map((product, i) => (
              <span
                key={i}
                className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              >
                {product}
              </span>
            ))}
          </div>
        </div>
      )}

      {keyMetrics && keyMetrics.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500">Key Metrics</h3>
          <ul className="mt-1 space-y-0.5">
            {keyMetrics.map((metric, i) => (
              <li key={i} className="text-sm text-gray-900 dark:text-white">
                {metric}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
