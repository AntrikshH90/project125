'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Trash2, X, Upload, Check, ShieldCheck, Loader2, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Person {
  id: string;
  name: string;
  referenceImagePath: string;
  createdAt: string;
}

interface AuthorizedPersonsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthorizedPersonsModal({ isOpen, onClose }: AuthorizedPersonsModalProps) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPersons = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/persons');
      if (res.ok) {
        const data = await res.json();
        setPersons(data);
      }
    } catch (e) {
      console.error('Failed to fetch authorized persons', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPersons();
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      if (photo) {
        fd.append('photo', photo);
      }

      const res = await fetch('/api/persons', {
        method: 'POST',
        body: fd,
      });

      if (res.ok) {
        setName('');
        setPhoto(null);
        setPreviewUrl(null);
        fetchPersons();
      }
    } catch (err) {
      console.error('Failed to enroll person', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to revoke gate access for this person?')) return;
    try {
      const res = await fetch(`/api/persons?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPersons((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete person', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl rounded-2xl border border-white/15 bg-zinc-900 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">
                Authorized Face Registry
              </h3>
              <p className="text-xs text-zinc-400">
                Manage registered family & staff members for AI gate entry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Enrollment Form */}
        <form onSubmit={handleEnroll} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            <UserPlus className="h-4 w-4 text-emerald-400" />
            <span>Enroll New Authorized Person</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Antriksh (Homeowner)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Reference Face Photo</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-black/40 border border-dashed border-white/20 hover:border-emerald-500/40 px-3 py-2 text-xs text-zinc-300 transition"
              >
                {previewUrl ? (
                  <div className="flex items-center gap-2 truncate">
                    <img src={previewUrl} alt="Preview" className="h-5 w-5 rounded-full object-cover" />
                    <span className="truncate">{photo?.name}</span>
                  </div>
                ) : (
                  <>
                    <Camera className="h-4 w-4 text-zinc-400" />
                    <span>Upload Face Photo</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 shadow-glow-emerald disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span>Enroll & Save Embedding</span>
            </button>
          </div>
        </form>

        {/* Existing Authorized Persons List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
            <span>Registered Persons ({persons.length})</span>
            <span className="text-zinc-500 font-mono">128-d Euclidean Match</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8 text-zinc-500">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : persons.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-black/30 p-8 text-center text-xs text-zinc-500">
              No registered persons yet. Enroll your face above to enable auto gate unlock!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {persons.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:border-white/20 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={person.referenceImagePath || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={person.name}
                      className="h-10 w-10 rounded-full object-cover border border-white/15 bg-zinc-800"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-200 truncate">{person.name}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                        <ShieldCheck className="h-3 w-3" /> Authorized Access
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(person.id)}
                    title="Revoke Access"
                    className="rounded-lg p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
