import { TaskDocumentUploader } from "./task-document-uploader";
import { Pill, EmptyState } from "./ui";

type ClosingTask = {
  id: string;
  title: string;
  status: string;
};

type ClosingTaskDoc = { id: string; task_id: string; file_name: string; storage_path: string };

// Client-facing view of the closing-process checklist - title and status are
// staff-managed (view only here); the client's job is just uploading the
// documents each item needs to be closed out.
export function ClientClosingTasks({
  companyId,
  tasks,
  documentsByTask,
}: {
  companyId: string;
  tasks: ClosingTask[];
  documentsByTask: Record<string, ClosingTaskDoc[]>;
}) {
  const statusVariant: Record<string, "g" | "a" | "n"> = {
    "Not Started": "n",
    "In Progress": "a",
    Complete: "g",
  };

  return (
    <div className="ccard" style={{ marginBottom: 16 }}>
      <header>
        <h3>Closing checklist</h3>
        <span className="hint">{tasks.length} items</span>
      </header>
      <div style={{ padding: "4px 15px" }}>
        {tasks.length === 0 && <EmptyState title="Nothing here yet" />}
        {tasks.map((t) => (
          <div key={t.id} style={{ borderBottom: "1px solid var(--rule-soft)", padding: "12px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <b style={{ fontSize: 13, flex: 1 }}>{t.title}</b>
              <Pill variant={statusVariant[t.status] ?? "n"}>{t.status}</Pill>
            </div>
            <TaskDocumentUploader companyId={companyId} taskId={t.id} existing={documentsByTask[t.id] ?? []} />
          </div>
        ))}
      </div>
    </div>
  );
}
