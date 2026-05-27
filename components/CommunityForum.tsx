import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, ThumbsUp, User, Plus, Filter, MessageCircle, X, Loader2 } from 'lucide-react';
import { ForumPost } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../src/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';

export const CommunityForum: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'General' });

  useEffect(() => {
    const q = query(collection(db, 'forum_posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: ForumPost[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as ForumPost);
      });
      setPosts(results);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'forum_posts');
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      alert("Please sign in to post.");
      return;
    }

    try {
      const postData = {
        ...newPost,
        authorName: auth.currentUser.displayName || 'Anonymous',
        authorId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        likes: 0,
        replies: 0
      };
      await addDoc(collection(db, 'forum_posts'), postData);
      setIsModalOpen(false);
      setNewPost({ title: '', content: '', category: 'General' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'forum_posts');
    }
  };

  const handleLike = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const postRef = doc(db, 'forum_posts', postId);
      await updateDoc(postRef, { likes: increment(1) });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `forum_posts/${postId}`);
    }
  };

  const filteredPosts = posts.filter(p => 
    (category === 'All' || p.category === category) &&
    (p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     p.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const categories = ['All', 'General', 'Recommendations', 'Tips & Tricks', 'Meetups', 'Questions'];

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50 custom-scrollbar p-6 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-gray-900">Community Forum</h2>
            <p className="text-gray-500 font-medium">Connect with other wellness-conscious travelers.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-[#FF385C] text-white rounded-2xl font-bold shadow-lg shadow-red-100 hover:bg-[#d9304e] transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            New Post
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text"
              placeholder="Search discussions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#FF385C] focus:border-transparent outline-none font-bold text-gray-700"
            />
          </div>
          <button className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-400 hover:text-gray-600 transition-colors">
            <Filter className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-6 py-2 rounded-full font-bold text-sm transition-all border ${
                category === cat 
                ? 'bg-gray-900 border-gray-900 text-white shadow-lg' 
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-[#FF385C]" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <div key={post.id} className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all group cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#FF385C] uppercase tracking-widest">{post.category}</span>
                      <span className="text-xs font-bold text-gray-400">
                        {post.createdAt instanceof Object && 'seconds' in post.createdAt 
                          ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() 
                          : 'Just now'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-[#FF385C] transition-colors">{post.title}</h3>
                    <p className="text-sm text-gray-600 font-medium line-clamp-2 leading-relaxed">{post.content}</p>
                    
                    <div className="flex items-center gap-6 pt-4">
                      <button 
                        onClick={(e) => handleLike(post.id, e)}
                        className="flex items-center gap-1.5 text-gray-400 hover:text-[#FF385C] transition-colors"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span className="text-xs font-bold">{post.likes}</span>
                      </button>
                      <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-gray-600 transition-colors">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs font-bold">{post.replies}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-gray-600 transition-colors">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs font-bold">Join Discussion</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Post Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Create New Post</h2>
                <p className="text-gray-500 font-medium text-sm">Share your thoughts with the community.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Title</label>
                <input 
                  required
                  type="text"
                  value={newPost.title}
                  onChange={e => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF385C] outline-none font-bold"
                  placeholder="What's on your mind?"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Category</label>
                <select 
                  value={newPost.category}
                  onChange={e => setNewPost(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF385C] outline-none font-bold"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Content</label>
                <textarea 
                  required
                  rows={4}
                  value={newPost.content}
                  onChange={e => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF385C] outline-none font-bold resize-none"
                  placeholder="Tell us more..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg active:scale-95"
                >
                  Post to Forum
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
