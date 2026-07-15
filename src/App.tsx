import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { Contact, leererKontakt, anzeigename } from "./types";
import { getStatus, saveContacts, lockVault, changePassword } from "./api";
import AuthScreen from "./components/AuthScreen";
import ContactList from "./components/ContactList";
import ContactDetail from "./components/ContactDetail";
import ContactForm from "./components/ContactForm";

type Phase = "loading" | "setup" | "unlock" | "ready";
type EditMode = "none" | "new" | "edit";

export default function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suche, setSuche] = useState("");
  const [editMode, setEditMode] = useState<EditMode>("none");
  const [entwurf, setEntwurf] = useState<Contact | null>(null);
  const [fehler, setFehler] = useState("");
  const [pwDialog, setPwDialog] = useState(false);

  // Beim Start: gibt es schon einen Tresor?
  useEffect(() => {
    getStatus()
      .then((s) => setPhase(s.initialized ? "unlock" : "setup"))
      .catch((e) => setFehler(String(e)));
  }, []);

  function onUnlocked(json: string) {
    try {
      const geladen = JSON.parse(json) as Contact[];
      setContacts(Array.isArray(geladen) ? geladen : []);
    } catch {
      setContacts([]);
    }
    setPhase("ready");
  }

  // Zentrale Persistenz: Zustand setzen und verschlüsselt speichern.
  async function persist(next: Contact[]) {
    setContacts(next);
    try {
      await saveContacts(JSON.stringify(next));
      setFehler("");
    } catch (e) {
      setFehler("Speichern fehlgeschlagen: " + String(e));
    }
  }

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    const liste = q
      ? contacts.filter((k) =>
          [k.vorname, k.nachname, k.firma, k.email, k.ort, k.kategorie]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : contacts;
    return [...liste].sort((a, b) =>
      anzeigename(a).localeCompare(anzeigename(b), "de"),
    );
  }, [contacts, suche]);

  const ausgewaehlt = contacts.find((k) => k.id === selectedId) ?? null;

  function neuerKontakt() {
    setEntwurf(leererKontakt());
    setEditMode("new");
    setSelectedId(null);
  }

  function bearbeiten() {
    if (ausgewaehlt) {
      setEntwurf(ausgewaehlt);
      setEditMode("edit");
    }
  }

  async function speichern(k: Contact) {
    if (editMode === "new") {
      await persist([...contacts, k]);
    } else {
      await persist(contacts.map((c) => (c.id === k.id ? k : c)));
    }
    setSelectedId(k.id);
    setEditMode("none");
    setEntwurf(null);
  }

  async function loeschen(id: string) {
    const k = contacts.find((c) => c.id === id);
    const ok = window.confirm(
      `Kontakt „${k ? anzeigename(k) : ""}“ wirklich löschen?`,
    );
    if (!ok) return;
    await persist(contacts.filter((c) => c.id !== id));
    setSelectedId(null);
  }

  async function sperren() {
    await lockVault();
    setContacts([]);
    setSelectedId(null);
    setEditMode("none");
    setEntwurf(null);
    setSuche("");
    setPhase("unlock");
  }

  if (phase === "loading") {
    return <div className="zentriert">Wird geladen…</div>;
  }
  if (phase === "setup" || phase === "unlock") {
    return <AuthScreen mode={phase} onUnlocked={onUnlocked} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="marke">Adressverwaltung</div>
        <input
          className="suche"
          type="search"
          placeholder="Suchen…"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
        />
        <div className="topbar-aktionen">
          <button className="btn-ghost-hell" onClick={() => setPwDialog(true)}>
            Passwort ändern
          </button>
          <button className="btn-ghost-hell" onClick={sperren}>
            Sperren
          </button>
        </div>
      </header>

      {fehler && <div className="fehlerband">{fehler}</div>}

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-kopf">
            <span>{contacts.length} Kontakte</span>
            <button className="btn-primary klein" onClick={neuerKontakt}>
              + Neu
            </button>
          </div>
          <ContactList
            contacts={gefiltert}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setEditMode("none");
            }}
          />
        </aside>

        <main className="hauptbereich">
          {editMode !== "none" && entwurf ? (
            <ContactForm
              contact={entwurf}
              istNeu={editMode === "new"}
              onSave={speichern}
              onCancel={() => {
                setEditMode("none");
                setEntwurf(null);
              }}
            />
          ) : ausgewaehlt ? (
            <ContactDetail
              contact={ausgewaehlt}
              onEdit={bearbeiten}
              onDelete={() => loeschen(ausgewaehlt.id)}
            />
          ) : (
            <div className="platzhalter">
              <p>Wählen Sie links einen Kontakt aus</p>
              <p>oder legen Sie mit „+ Neu" einen neuen an.</p>
            </div>
          )}
        </main>
      </div>

      {pwDialog && (
        <PasswortDialog
          onClose={() => setPwDialog(false)}
          onSuccess={() => setPwDialog(false)}
        />
      )}
    </div>
  );
}

function PasswortDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [alt, setAlt] = useState("");
  const [neu, setNeu] = useState("");
  const [neu2, setNeu2] = useState("");
  const [fehler, setFehler] = useState("");
  const [busy, setBusy] = useState(false);

  async function absenden() {
    setFehler("");
    if (neu.length < 4) {
      setFehler("Das neue Passwort muss mindestens 4 Zeichen haben.");
      return;
    }
    if (neu !== neu2) {
      setFehler("Die neuen Passwörter stimmen nicht überein.");
      return;
    }
    setBusy(true);
    try {
      await changePassword(alt, neu);
      onSuccess();
    } catch (e) {
      setFehler(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-hintergrund" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Master-Passwort ändern</h2>
        <label className="feld">
          <span>Aktuelles Passwort</span>
          <input type="password" value={alt} onChange={(e) => setAlt(e.target.value)} />
        </label>
        <label className="feld">
          <span>Neues Passwort</span>
          <input type="password" value={neu} onChange={(e) => setNeu(e.target.value)} />
        </label>
        <label className="feld">
          <span>Neues Passwort bestätigen</span>
          <input type="password" value={neu2} onChange={(e) => setNeu2(e.target.value)} />
        </label>
        {fehler && <div className="auth-fehler">{fehler}</div>}
        <div className="modal-aktionen">
          <button className="btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn-primary" onClick={absenden} disabled={busy}>
            {busy ? "Bitte warten…" : "Ändern"}
          </button>
        </div>
      </div>
    </div>
  );
}
