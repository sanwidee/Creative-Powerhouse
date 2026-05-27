import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Grid3X3, ImageIcon, Link2, Plus, Sun, Moon, XCircle, Trash2, Pencil, Check } from 'lucide-react';
import { FeedPreviewProject, FeedPreviewState, GeneratedPost } from '../types';

interface FeedPreviewProps {
  generatedPosts: GeneratedPost[];
  projects: FeedPreviewProject[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: (name?: string) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onUpdateProjectState: (id: string, next: FeedPreviewState) => void;
  onBack: () => void;
}

const clampText = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

const FeedPreview: React.FC<FeedPreviewProps> = ({
  generatedPosts,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onRenameProject,
  onUpdateProjectState,
  onBack,
}) => {
  const [search, setSearch] = useState('');
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || projects[0],
    [projects, activeProjectId]
  );

  const feedPreview = activeProject?.state;
  if (!activeProject || !feedPreview) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <button onClick={onBack} className="p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all active:scale-95 flex items-center justify-center border border-slate-700/50">
          <ArrowLeft size={22} />
        </button>
        <div className="mt-6 text-slate-500">No feed previews found. Create one to start.</div>
        <button
          onClick={() => onCreateProject('New Account')}
          className="mt-4 px-5 py-3 rounded-2xl bg-pink-600 hover:bg-pink-500 text-white text-sm font-black transition"
        >
          Create Feed Preview
        </button>
      </div>
    );
  }

  const igTheme = feedPreview.profile.igTheme || 'light';
  const selectedSet = useMemo(() => new Set(feedPreview.postIds), [feedPreview.postIds]);

  const postsById = useMemo(() => {
    const map = new Map<string, GeneratedPost>();
    for (const p of generatedPosts) map.set(p.id, p);
    return map;
  }, [generatedPosts]);

  const selectedPosts = useMemo(() => {
    return feedPreview.postIds
      .map((id) => postsById.get(id))
      .filter(Boolean) as GeneratedPost[];
  }, [feedPreview.postIds, postsById]);

  const availablePosts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const items = generatedPosts.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (!term) return items;
    return items.filter((p) => (p.name || '').toLowerCase().includes(term));
  }, [generatedPosts, search]);

  const update = (patch: Partial<FeedPreviewState>) => {
    onUpdateProjectState(activeProject.id, {
      ...feedPreview,
      ...patch,
      updatedAt: Date.now(),
    });
  };

  const updateProfile = (patch: Partial<FeedPreviewState['profile']>) => {
    update({ profile: { ...feedPreview.profile, ...patch } });
  };

  const addPost = (id: string) => {
    if (selectedSet.has(id)) return;
    update({ postIds: [...feedPreview.postIds, id] });
  };

  const removePost = (id: string) => {
    if (!selectedSet.has(id)) return;
    const nextPostIds = feedPreview.postIds.filter((x) => x !== id);
    const { [id]: _removed, ...restCaptions } = feedPreview.captions || {};
    update({ postIds: nextPostIds, captions: restCaptions });
    if (activePostId === id) setActivePostId(null);
  };

  const movePost = (id: string, dir: -1 | 1) => {
    const idx = feedPreview.postIds.indexOf(id);
    if (idx < 0) return;
    const swapWith = idx + dir;
    if (swapWith < 0 || swapWith >= feedPreview.postIds.length) return;
    const next = feedPreview.postIds.slice();
    const tmp = next[idx];
    next[idx] = next[swapWith];
    next[swapWith] = tmp;
    update({ postIds: next });
  };

  const openPost = (id: string) => {
    setActivePostId(id);
    setCaptionDraft(feedPreview.captions?.[id] || '');
  };

  const saveCaption = () => {
    if (!activePostId) return;
    update({ captions: { ...(feedPreview.captions || {}), [activePostId]: captionDraft } });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => updateProfile({ avatarDataUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const activePost = activePostId ? postsById.get(activePostId) : null;

  const igShell = igTheme === 'dark'
    ? 'bg-black text-white border-slate-800'
    : 'bg-white text-slate-900 border-slate-200';

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
        <div className="flex items-center space-x-5">
          <button onClick={onBack} className="p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all active:scale-95 flex items-center justify-center border border-slate-700/50">
            <ArrowLeft size={22} />
          </button>
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <Grid3X3 className="text-pink-500" size={22} />
              <h2 className="text-4xl font-black tracking-tighter italic uppercase">FEED <span className="text-pink-500">PREVIEW</span></h2>
            </div>
            <p className="text-slate-400 text-sm font-medium">Instagram-style profile grid mockup. Link your generated posts into a curated feed.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900/50 p-2 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
            <select
              value={activeProject.id}
              onChange={(e) => {
                setIsRenaming(false);
                onSelectProject(e.target.value);
              }}
              className="px-4 py-2.5 rounded-2xl text-xs font-black bg-transparent border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <button
              onClick={() => onCreateProject('weedlabs.online')}
              className="px-4 py-2.5 rounded-2xl text-xs font-black bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
              title="Create new preview"
            >
              New
            </button>

            {!isRenaming ? (
              <button
                onClick={() => {
                  setIsRenaming(true);
                  setRenameDraft(activeProject.name);
                }}
                className="p-2.5 rounded-2xl text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                title="Rename"
              >
                <Pencil size={16} />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  className="w-44 px-3 py-2 rounded-2xl text-xs font-bold bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 outline-none"
                />
                <button
                  onClick={() => {
                    const nextName = renameDraft.trim();
                    if (nextName) onRenameProject(activeProject.id, nextName);
                    setIsRenaming(false);
                  }}
                  className="p-2.5 rounded-2xl bg-pink-600 hover:bg-pink-500 text-white"
                  title="Save name"
                >
                  <Check size={16} />
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setIsRenaming(false);
                onDeleteProject(activeProject.id);
              }}
              className="p-2.5 rounded-2xl text-slate-500 hover:text-rose-600 border border-slate-200 dark:border-slate-800"
              title="Delete"
              disabled={projects.length <= 1}
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900/50 p-2 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
            <button
              onClick={() => updateProfile({ igTheme: 'light' })}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${igTheme === 'light' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
            >
              <Sun size={14} /><span>IG Light</span>
            </button>
            <button
              onClick={() => updateProfile({ igTheme: 'dark' })}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${igTheme === 'dark' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
            >
              <Moon size={14} /><span>IG Dark</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none">
            <div className="flex items-center justify-between mb-5">
              <div className="text-xs font-black tracking-[0.22em] uppercase text-slate-500">Profile</div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
              >
                Upload Avatar
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-4">
                <div className="w-24 h-24 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  {feedPreview.profile.avatarDataUrl ? (
                    <img src={feedPreview.profile.avatarDataUrl} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="text-slate-400" size={28} />
                  )}
                </div>
                {feedPreview.profile.avatarDataUrl && (
                  <button
                    onClick={() => updateProfile({ avatarDataUrl: undefined })}
                    className="mt-3 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    Clear avatar
                  </button>
                )}
              </div>

              <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black tracking-[0.22em] uppercase text-slate-500 mb-2">Handle</label>
                  <input
                    value={feedPreview.profile.handle}
                    onChange={(e) => updateProfile({ handle: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-pink-500/30 text-sm font-semibold"
                    placeholder="qlipper.ai"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black tracking-[0.22em] uppercase text-slate-500 mb-2">Display name</label>
                  <input
                    value={feedPreview.profile.displayName}
                    onChange={(e) => updateProfile({ displayName: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-pink-500/30 text-sm font-semibold"
                    placeholder="Qlipper AI"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black tracking-[0.22em] uppercase text-slate-500 mb-2">Bio</label>
                  <textarea
                    value={feedPreview.profile.bio}
                    onChange={(e) => updateProfile({ bio: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-pink-500/30 text-sm min-h-[92px]"
                    placeholder="Describe your account in 1-3 lines."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black tracking-[0.22em] uppercase text-slate-500 mb-2">Website</label>
                  <div className="relative">
                    <Link2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={feedPreview.profile.website}
                      onChange={(e) => updateProfile({ website: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-pink-500/30 text-sm font-semibold"
                      placeholder="https://qlipper.ai"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
              <div>
                <div className="text-xs font-black tracking-[0.22em] uppercase text-slate-500">Link Generated Posts</div>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-1">Selected: <span className="text-pink-500">{feedPreview.postIds.length}</span></div>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full md:w-72 px-4 py-3 rounded-2xl bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-pink-500/30 text-sm"
                placeholder="Search generated posts..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-auto pr-1">
              {availablePosts.length === 0 ? (
                <div className="text-sm text-slate-500">No generated posts found yet. Generate a few in Post Generator first.</div>
              ) : (
                availablePosts.map((p) => {
                  const isSelected = selectedSet.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => (isSelected ? removePost(p.id) : addPost(p.id))}
                      className={`w-full text-left flex items-center gap-3 p-3 rounded-2xl border transition-all ${isSelected
                        ? 'border-pink-500/40 bg-pink-500/5'
                        : 'border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-950/10 hover:bg-white/70 dark:hover:bg-slate-950/20'
                        }`}
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shrink-0">
                        <img src={p.imageSource} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black tracking-tight text-slate-900 dark:text-white truncate">{p.name || 'Untitled'}</div>
                        <div className="text-[11px] font-semibold text-slate-500 truncate">{new Date(p.createdAt).toLocaleString()}</div>
                      </div>
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-pink-600 text-white' : 'bg-slate-900 text-white dark:bg-slate-800'}`}>
                        <Plus size={16} className={isSelected ? 'rotate-45 transition-transform' : 'transition-transform'} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {feedPreview.postIds.length > 0 && (
            <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none">
              <div className="text-xs font-black tracking-[0.22em] uppercase text-slate-500 mb-5">Order</div>
              <div className="space-y-2">
                {feedPreview.postIds.map((id, idx) => {
                  const p = postsById.get(id);
                  if (!p) return null;
                  return (
                    <div key={id} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-950/10">
                      <button onClick={() => openPost(id)} className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 shrink-0">
                        <img src={p.imageSource} className="w-full h-full object-cover" />
                      </button>
                      <button onClick={() => openPost(id)} className="min-w-0 flex-1 text-left">
                        <div className="text-sm font-black tracking-tight text-slate-900 dark:text-white truncate">{p.name || 'Untitled'}</div>
                        <div className="text-[11px] font-semibold text-slate-500 truncate">
                          {feedPreview.captions?.[id] ? clampText(feedPreview.captions[id], 60) : 'No caption (click to add)'}
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => movePost(id, -1)}
                          disabled={idx === 0}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-40"
                          title="Move up"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          onClick={() => movePost(id, 1)}
                          disabled={idx === feedPreview.postIds.length - 1}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-40"
                          title="Move down"
                        >
                          <ChevronDown size={16} />
                        </button>
                        <button
                          onClick={() => removePost(id)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-600"
                          title="Remove"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="xl:col-span-5">
          <div className="sticky top-6">
            <div className="mx-auto w-full max-w-[420px]">
              <div className={`rounded-[2.5rem] border ${igShell} shadow-2xl overflow-hidden`}
                style={{ boxShadow: igTheme === 'dark' ? '0 20px 60px rgba(0,0,0,0.55)' : '0 20px 60px rgba(2,6,23,0.12)' }}
              >
                {/* Top bar */}
                <div className={`px-5 py-4 border-b ${igTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'} flex items-center justify-between`}>
                  <div className="text-sm font-black tracking-tight">{feedPreview.profile.handle || 'your.handle'}</div>
                  <div className="text-[11px] font-bold opacity-70">Preview</div>
                </div>

                {/* Profile */}
                <div className="px-5 py-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-20 h-20 rounded-full overflow-hidden border ${igTheme === 'dark' ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-100'} flex items-center justify-center`}
                    >
                      {feedPreview.profile.avatarDataUrl ? (
                        <img src={feedPreview.profile.avatarDataUrl} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={26} className={igTheme === 'dark' ? 'text-slate-600' : 'text-slate-400'} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-black tracking-tight">{feedPreview.profile.displayName || 'Your Name'}</div>
                        <div className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${igTheme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100 border border-slate-200'}`}>Edit profile</div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                        <div>
                          <div className="text-sm font-black">{selectedPosts.length}</div>
                          <div className="text-[10px] font-bold opacity-70">posts</div>
                        </div>
                        <div>
                          <div className="text-sm font-black">—</div>
                          <div className="text-[10px] font-bold opacity-70">followers</div>
                        </div>
                        <div>
                          <div className="text-sm font-black">—</div>
                          <div className="text-[10px] font-bold opacity-70">following</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-[12px] font-semibold whitespace-pre-wrap leading-snug opacity-95">{feedPreview.profile.bio || 'Your bio will show here.'}</div>
                    {feedPreview.profile.website && (
                      <div className={`mt-2 text-[12px] font-bold ${igTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{feedPreview.profile.website}</div>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className={`px-5 py-3 border-t ${igTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'} flex items-center justify-center`}>
                  <div className={`p-2 rounded-xl ${igTheme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100 border border-slate-200'}`}>
                    <Grid3X3 size={18} />
                  </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-3 gap-[2px]">
                  {(selectedPosts.length ? selectedPosts : new Array(9).fill(null)).map((p: any, idx: number) => {
                    if (!p) {
                      return (
                        <div key={idx} className={`${igTheme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'} aspect-square`} />
                      );
                    }
                    return (
                      <button key={p.id} onClick={() => openPost(p.id)} className="relative aspect-square overflow-hidden">
                        <img src={p.imageSource} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-black/30" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 text-center text-xs text-slate-500">
                Click a tile to preview + edit caption.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Post modal */}
      {activePost && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-950 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="min-w-0">
                <div className="text-sm font-black tracking-tight truncate">{activePost.name || 'Post'}</div>
                <div className="text-[11px] text-slate-500 font-semibold">Draft caption is stored in Feed Preview (does not modify the original post).</div>
              </div>
              <button onClick={() => setActivePostId(null)} className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white">
                <XCircle size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              <div className="bg-slate-50 dark:bg-black p-4">
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black">
                  <img src={activePost.imageSource} className="w-full h-auto" />
                </div>
              </div>
              <div className="p-6">
                <label className="block text-[10px] font-black tracking-[0.22em] uppercase text-slate-500 mb-2">Caption</label>
                <textarea
                  value={captionDraft}
                  onChange={(e) => setCaptionDraft(e.target.value)}
                  className="w-full min-h-[220px] px-4 py-3 rounded-2xl bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-pink-500/30 text-sm"
                  placeholder="Write your caption here (hook, value, CTA, hashtags)."
                />

                <div className="flex items-center justify-between gap-3 mt-4">
                  <button
                    onClick={() => removePost(activePost.id)}
                    className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-600 hover:text-rose-600"
                  >
                    Remove from feed
                  </button>
                  <button
                    onClick={() => {
                      saveCaption();
                      setActivePostId(null);
                    }}
                    className="px-5 py-3 rounded-2xl bg-pink-600 hover:bg-pink-500 text-white text-sm font-black transition shadow-lg shadow-pink-900/20"
                  >
                    Save caption
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedPreview;
