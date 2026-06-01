import { useState, useEffect, useRef, useCallback } from 'react';

// ============== INLINE SVG ICONS ==============
const Svg = ({ children, d, size = 20, style, ...rest }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} style={{ flexShrink: 0, ...style }} {...rest}>
    {d ? (typeof d === 'string' ? <path d={d} /> : d) : children}
  </svg>
);
const I = {
  Mic: (p) => <Svg {...p} d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>,
  MicOff: (p) => <Svg {...p} d="M19 11h-1.7c0 .74-.16 1.44-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>,
  Camera: (p) => <Svg {...p} d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>,
  CameraOff: (p) => <Svg {...p} d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.55-.18L19.73 21 21 19.73 3.27 2z"/>,
  Screen: (p) => <Svg {...p} d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>,
  Invite: (p) => <Svg {...p} d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>,
  Members: (p) => <Svg {...p} d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>,
  Chat: (p) => <Svg {...p} d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>,
  Close: (p) => <Svg {...p} d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>,
  ChevronDown: (p) => <Svg {...p} d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/>,
  ChevronUp: (p) => <Svg {...p} d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"/>,
  Speaker: (p) => <Svg {...p} d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>,
  Caption: (p) => <Svg {...p} d="M19 4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-9 13H7v-2h3v2zm0-3H7v-1h3v1zm0-3H7V9h3v2zm4.68 6h-2.16l-.84-2h-1.68l-.84 2h-2.16L10.22 7h2.56l1.9 7zM14 11.73L13.06 9h-.12L12 11.73V13h2v-1.27z"/>,
  Record: (p) => <Svg {...p}><circle cx="12" cy="12" r="6"/></Svg>,
  Poll: (p) => <Svg {...p} d="M3 3v18h18V3H3zm6 14H7v-5h2v5zm4 0h-2V7h2v10zm4 0h-2v-5h2v5z"/>,
  Crown: (p) => <Svg {...p} d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3v2H5v-2h14z"/>,
  Translate: (p) => <Svg {...p} d="M12.87 15.07l-2.54-2.51.03-.03C12.88 10.14 14.67 7.76 15.5 5h-11V3h7V1h2v2h7v2h-2.07c-.88 2.77-2.47 5.5-4.63 7.58.79 1.05 1.68 1.99 2.67 2.8l-1.27 1.26c-1.04-.93-2.06-2.01-3-3.29zm-3.54-2.71L7 14.67V17H5v-3H2v-2h3.45l.87-1.3-.82-1.22H3.67l1.43-1.95h3.54l2.69 3.83z"/>,
  Hand: (p) => <Svg {...p} d="M21 7c0-1.38-1.12-2.5-2.5-2.5-.17 0-.34.02-.5.05V4.5c0-1.38-1.12-2.5-2.5-2.5-.54 0-1.04.18-1.44.46C13.45 1.43 12.33 1 11 1c-1.74 0-3.26.83-4.23 2.12-.67-.45-1.47-.67-2.27-.55C2.9 2.86 2 4.03 2 5.5V17c0 3.31 2.69 6 6 6h6c4.97 0 9-4.03 9-9V7z"/>,
  Layout: (p) => <Svg {...p} d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/>,
  Search: (p) => <Svg {...p} d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>,
  VideoCall: (p) => <Svg {...p} d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"/>,
  Emoji: (p) => <Svg {...p} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3.5-9c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm7 0c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>,
  Sparkle: (p) => <Svg {...p} d="M19.48 12.35c-1.57-4.08-7.11-4.66-10.44-.82-1.22 1.38-2.17 2.81-2.84 4.28-.3.65-.09 1.43.5 1.83.6.4 1.39.28 1.85-.28.62-.76 1.38-1.49 2.26-2.14 2.31-1.73 5.33-1.75 6.67-.05.33.42.84.63 1.35.55.51-.08.93-.44 1.09-.93.15-.49.02-1.03-.31-1.41-.43-.52-.93-1.03-1.13-1.03zM7 6c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm12 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM12 2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/>,
  AI: (p) => <Svg {...p} d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/>,
  Check: (p) => <Svg {...p} d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>,
  WindowMin: (p) => <Svg {...p} d="M19 13H5v-2h14v2z"/>,
  WindowMax: (p) => <Svg {...p} d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>,
  Settings: (p) => <Svg {...p} d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>,
  Send: (p) => <Svg {...p} d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>,
  More: (p) => <Svg {...p} d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>,
  Apps: (p) => <Svg {...p} d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/>,
  Share: (p) => <Svg {...p} d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>,
  Copy: (p) => <Svg {...p} d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>,
  Signal: (p) => <Svg {...p} d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>,
  Security: (p) => <Svg {...p} d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>,
  Refresh: (p) => <Svg {...p} d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>,
  Lock: (p) => <Svg {...p} d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/>,
};

// ============== HELPERS ==============
const fmtTime = s => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return h ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
};

// ============== DATA LOADING ==============
function loadContactsFromLocalStorage() {
  const contacts = [];
  const addedIds = new Set();
  let removedIds;
  try { removedIds = new Set(JSON.parse(localStorage.getItem('video_room_removed_ids') || '[]')); } catch (_) { removedIds = new Set(); }

  // 1) Family accounts
  try {
    const families = JSON.parse(localStorage.getItem('classroom_family_accounts') || '[]');
    for (const f of families) {
      const parentId = `family-${f.id}-parent`;
      if (!addedIds.has(parentId) && !removedIds.has(parentId)) {
        contacts.push({ id: parentId, name: f.parentName || 'Parent', role: 'Parent', email: f.parentEmail || '', avatar: '👨‍👩‍👧', status: 'active', source: 'family' });
        addedIds.add(parentId);
      }
      if (Array.isArray(f.children)) {
        f.children.forEach((child, idx) => {
          const cid = `family-${f.id}-child-${idx}`;
          if (!addedIds.has(cid) && !removedIds.has(cid)) {
            contacts.push({ id: cid, name: child.name || 'Child', role: 'Student', email: f.parentEmail || '', subject: child.subject || '', avatar: '👦', status: 'active', source: 'family' });
            addedIds.add(cid);
          }
        });
      }
    }
  } catch (_) {}

  // 2) Teachers
  try {
    const teachers = JSON.parse(localStorage.getItem('linguaclass_teachers') || '[]');
    for (const t of teachers) {
      const tid = `teacher-${t.id}`;
      if (!addedIds.has(tid) && !removedIds.has(tid) && t.name) {
        contacts.push({ id: tid, name: t.name, role: 'Teacher', email: t.email || '', subject: t.subject || '', avatar: '👩‍🏫', status: t.status === 'inactive' ? 'offline' : 'active', source: 'teacher' });
        addedIds.add(tid);
      }
    }
  } catch (_) {}

  // 3) Students
  try {
    const students = JSON.parse(localStorage.getItem('linguaclass_students') || '[]');
    for (const s of students) {
      const sid = `student-${s.id}`;
      if (!addedIds.has(sid) && !removedIds.has(sid) && s.name) {
        contacts.push({ id: sid, name: s.name, role: 'Student', email: s.parentEmail || '', subject: s.subject || '', avatar: s.avatar || '👦', status: 'active', source: 'student' });
        addedIds.add(sid);
      }
    }
  } catch (_) {}

  // 4) Manually added
  try {
    const vr = JSON.parse(localStorage.getItem('video_room_contacts') || '[]');
    for (const c of vr) {
      if (!addedIds.has(c.id) && !removedIds.has(c.id)) {
        contacts.push({ ...c, source: 'manual' });
        addedIds.add(c.id);
      }
    }
  } catch (_) {}

  return contacts;
}

function persistVideoRoomContacts(contacts) {
  const manual = contacts.filter(c => c.source === 'manual');
  localStorage.setItem('video_room_contacts', JSON.stringify(manual));
}

function addRemovedId(id) {
  try {
    const removed = JSON.parse(localStorage.getItem('video_room_removed_ids') || '[]');
    if (!removed.includes(id)) { removed.push(id); localStorage.setItem('video_room_removed_ids', JSON.stringify(removed)); }
  } catch (_) {}
}

// ============== SEED DATA ==============
const TX = [
  { en:"Good morning everyone, let's get started with today's agenda.", zh:'大家早上好，让我们开始今天的议程。', speaker:'AI Huihui' },
  { en:'It is necessary to plan how to better link the procurement and sales sides.', zh:'有必要规划如何更好地连接采购和销售端。', speaker:'Wang Dapeng' },
  { en:'I have a question about the timeline for Q3 deliverables.', zh:'我有关于第三季度交付时间线的问题。', speaker:'Zhang Xiaoyu' },
  { en:'Pointed out the possibility of project delays, but also saw that efforts are being made to adhere to the original schedule.', zh:'指出了项目延迟的可能性，但也看到正在努力遵守原定时间表。', speaker:'Wang Xiaohong' },
  { en:'Meanwhile, Wang Xiao tactfully brought up the current risk factors.', zh:'与此同时，王晓巧妙地向与会者提出了当前的风险因素。', speaker:'AI Huihui' },
  { en:"Though she couldn't help but convey a hint of concern about the project's progress.", zh:'尽管她忍不住表达了对项目进展的担忧。', speaker:'Wang Dapeng' },
  { en:"Let's review the action items from last week's meeting.", zh:'让我们回顾上周会议的行动项目。', speaker:'AI Huihui' },
  { en:'The marketing campaign needs to launch by next Monday.', zh:'营销活动需要在下周一前启动。', speaker:'Wang Xiaohong' },
  { en:"I'll coordinate with the design team on the assets.", zh:'我会与设计团队协调相关素材。', speaker:'Zhang Xiaoyu' },
  { en:"Great, let's also discuss the budget allocation for this quarter.", zh:'好的，我们来讨论一下本季度的预算分配。', speaker:'Wang Dapeng' },
  { en:'Forty percent for R&D, thirty for marketing, thirty for operations.', zh:'研发占40%，营销占30%，运营占30%。', speaker:'AI Huihui' },
  { en:'That sounds reasonable. Any objections?', zh:'听起来很合理。有反对意见吗？', speaker:'Wang Xiaohong' },
  { en:'No objections from my side.', zh:'我没有异议。', speaker:'Zhang Xiaoyu' },
  { en:"Any more questions before we wrap up today's session?", zh:'结束前还有问题吗？', speaker:'AI Huihui' },
];

// ============== VIDEO TILE COMPONENT ==============
function VideoTile({ member, isMe,_name,_av, videoEnabled, localVideoRef, size, onPinned }) {
  const speaking = member.speaking;
  const tileClass = `vr-tile ${speaking ? 'vr-tile-spk' : ''} ${size === 'main' ? 'vr-tile-main' : size === 'side' ? 'vr-tile-side' : size === 'thumb' ? 'vr-tile-thumb' : ''}`;

  // Name tag accent color
  const accentColor = speaking ? '#34c759' : (member.role === 'Host' ? '#ff9f0a' : '#636366');

  const tileJsx = (
    <div className={tileClass} onClick={onPinned}>
      {(member.isMe && videoEnabled) ? (
        <video ref={localVideoRef} autoPlay playsInline muted className="vr-tile-vid" />
      ) : (
        <div className="vr-tile-bg">
          <span className="vr-tile-emoji">{member.isMe ? _av : member.avatar}</span>
        </div>
      )}

      {/* Name overlay - Tencent Meeting style with colored left bar */}
      <div className="vr-tile-label">
        <div className="vr-tile-label-bar" style={{ background: accentColor }} />
        <div className="vr-tile-label-body">
          <div className="vr-tile-label-top">
            <span className="vr-tile-label-name">{member.isMe ? _name : member.name}</span>
            {member.verified && <I.Check size={10} style={{ color: '#34c759', marginLeft: 3 }} />}
          </div>
          <span className="vr-tile-label-sub">
            {member.isMe ? 'Host' : member.role}
            {member.subject ? ` · ${member.subject}` : ''}
          </span>
        </div>
        <div className="vr-tile-label-mic">
          {member.isMe ? (
            member.micOn ? <I.Mic size={13} color="#fff" /> : <I.MicOff size={13} color="#ff3b30" />
          ) : (
            !member.micOn ? <I.MicOff size={13} color="#ff3b30" /> : (speaking ? <I.Mic size={13} color="#34c759" /> : null)
          )}
        </div>
      </div>

      {/* HD ULTRA badge */}
      {member.id === 'demo-3' && size !== 'side' && size !== 'thumb' && (
        <div className="vr-hd-badge"><span>HD</span><small>ULTRA</small></div>
      )}
    </div>
  );

  return tileJsx;
}

// ============== MAIN COMPONENT ==============
export default function VideoRoom({ user, onLeave, classData }) {
  const _name = user?.name || 'You';
  const role = user?.role || 'student';
  const _av = user?.avatar || '🙂';

  // Meeting state
  const [meetingTitle] = useState('Weekly Product Sync — Q3 Planning');
  const [meetingId] = useState(() => String(Math.floor(100000000 + Math.random() * 900000000)));
  const [duration, setDuration] = useState(5469);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [layoutMode, setLayoutMode] = useState('grid');
  const [pinnedMember, setPinnedMember] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  // Side panels
  const [activePanel, setActivePanel] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);

  // ============== WHITEBOARD STATE ==============
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [wbTool, setWbTool] = useState('pen'); // pen | eraser
  const [wbColor, setWbColor] = useState('#1d1d1f');
  const [wbBg, setWbBg] = useState('#ffffff'); // whiteboard default
  const [wbLineWidth, setWbLineWidth] = useState(3);
  const wbCanvasRef = useRef(null);
  const wbCtxRef = useRef(null);
  const wbDrawing = useRef(false);

  // Whiteboard drawing logic
  useEffect(() => {
    if (!showWhiteboard) return;
    const canvas = wbCanvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = wbBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    wbCtxRef.current = ctx;
  }, [showWhiteboard, wbBg]);

  const wbGetPos = (e) => {
    const canvas = wbCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };
  const wbStart = (e) => { e.preventDefault(); wbDrawing.current = true; const p = wbGetPos(e); wbCtxRef.current?.beginPath(); wbCtxRef.current?.moveTo(p.x, p.y); };
  const wbMove = (e) => {
    e.preventDefault();
    if (!wbDrawing.current) return;
    const ctx = wbCtxRef.current; if (!ctx) return;
    const p = wbGetPos(e);
    ctx.lineWidth = wbTool === 'eraser' ? 20 : wbLineWidth;
    ctx.strokeStyle = wbTool === 'eraser' ? wbBg : wbColor;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineTo(p.x, p.y); ctx.stroke();
  };
  const wbEnd = () => { wbDrawing.current = false; };
  const wbClear = () => {
    const canvas = wbCanvasRef.current; const ctx = wbCtxRef.current;
    if (!canvas || !ctx) return;
    ctx.fillStyle = wbBg; ctx.fillRect(0, 0, canvas.width, canvas.height);
  };
  const wbToggleBg = () => setWbBg(bg => bg === '#ffffff' ? '#2c2c2e' : '#ffffff');
  const WB_COLORS = ['#1d1d1f', '#ff3b30', '#ff9f0a', '#34c759', '#007aff', '#5856d6', '#af52de', '#ff2d55'];
  const WB_SIZES = [1, 3, 5, 8];

  // DEMO members to match Tencent Meeting screenshots
  const DEMO_MEMBERS = [
    { id: 'demo-1', name: 'AI Huihui', avatar: '👩‍💼', role: 'Tencent Meeting Account Manager', status: 'active', speaking: true, videoOn: false, micOn: true, verified: true, isMe: false, subject: '' },
    { id: 'demo-2', name: 'Wang Dapeng', avatar: '👨‍💼', role: 'Procurement Manager', status: 'active', speaking: false, videoOn: false, micOn: true, verified: false, isMe: false, subject: '' },
    { id: 'demo-3', name: 'Wang Xiaohong', avatar: '👩‍💻', role: 'Sales Consultant', status: 'active', speaking: false, videoOn: false, micOn: false, verified: true, isMe: false, subject: 'Sunshine Technology Group' },
    { id: 'demo-4', name: 'Zhang Xiaoyu', avatar: '👨‍🎓', role: 'Marketing Lead', status: 'active', speaking: false, videoOn: false, micOn: true, verified: false, isMe: false, subject: '' },
  ];

  // Start with host + demo members so the room looks populated
  const [members, setMembers] = useState(() => [
    { id: 'me', name: _name, avatar: _av, role: 'Host', status: 'active', speaking: false, videoOn: false, micOn: false, isMe: true, verified: true, subject: '' },
    ...DEMO_MEMBERS,
  ]);

  // Contacts
  const [contacts, setContacts] = useState(loadContactsFromLocalStorage);
  const [contactSearch, setContactSearch] = useState('');
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', role: 'Student', email: '', subject: '' });
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenVideoRef = useRef(null);
  const [screenStream, setScreenStream] = useState(null);

  // Chat
  const [chatMsg, setChatMsg] = useState('');
  const [chatMsgs, setChatMsgs] = useState([
    { id: 1, sender: 'AI Huihui', avatar: '👩‍💼', text: 'Welcome everyone! The meeting minutes will be generated automatically.', time: '01:31', isMe: false, isSystem: false },
    { id: 2, sender: 'Wang Dapeng', avatar: '👨‍💼', text: 'Thanks! I can see the real-time summary on the side panel.', time: '01:31', isMe: false, isSystem: false },
  ]);
  const chatEndRef = useRef(null);

  // Transcript
  const [transcriptLines, setTranscriptLines] = useState(TX.slice(0, 5).map((l, i) => ({ ...l, time: fmtTime(5469 + i * 300), id: i })));
  const txIdx = useRef(5);
  const [isTranscribing, setIsTranscribing] = useState(true);

  // AI Summary
  const [aiSummary, setAiSummary] = useState([
    { title: 'Conference', content: 'It is necessary to plan how to better link the procurement and sales sides in the next stage to increase the company\'s overall profit scale.', expanded: true },
    { title: 'Meeting to be done', content: 'Finalize Q3 budget allocation, coordinate design assets for marketing campaign.', expanded: false },
  ]);

  // Call state
  const [callingMember, setCallingMember] = useState(null);
  const [ringing, setRinging] = useState(false);

  // ============== INVITE CODE SYSTEM ==============
  const generate6DigitCode = () => String(Math.floor(100000 + Math.random() * 900000));
  const [inviteCode, setInviteCode] = useState(() => {
    const saved = localStorage.getItem('video_room_invite_code');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Date.now() - parsed.ts < 24 * 60 * 60 * 1000) return parsed.code;
      } catch (_) {}
    }
    const code = generate6DigitCode();
    localStorage.setItem('video_room_invite_code', JSON.stringify({ code, ts: Date.now() }));
    return code;
  });
  const [inviteCopied, setInviteCopied] = useState('');
  const [guestJoining, setGuestJoining] = useState(false);
  const [guestName, setGuestName] = useState('');
  const guestInputRef = useRef(null);

  const regenerateCode = () => {
    const code = generate6DigitCode();
    setInviteCode(code);
    localStorage.setItem('video_room_invite_code', JSON.stringify({ code, ts: Date.now() }));
  };

  const inviteLink = `${window.location.origin}${window.location.pathname}#?invite=${inviteCode}`;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setInviteCopied(label);
      setTimeout(() => setInviteCopied(''), 2000);
    }).catch(() => {});
  };

  // ============== GUEST JOIN ==============
  useEffect(() => {
    const hash = window.location.hash || '';
    const match = hash.match(/[?&]invite=(\d{6})/);
    if (match) {
      const urlCode = match[1];
      const saved = localStorage.getItem('video_room_invite_code');
      let valid = false;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.code === urlCode && (Date.now() - parsed.ts < 24 * 60 * 60 * 1000)) valid = true;
        } catch (_) {}
      }
      if (valid) {
        setGuestJoining(true);
        setTimeout(() => guestInputRef.current?.focus(), 100);
      }
    }
  }, []);

  const handleGuestJoin = () => {
    const gname = guestName.trim();
    if (!gname) return;
    const guestMember = {
      id: `guest-${Date.now()}`, name: gname, avatar: '🔑', role: 'Guest', status: 'active', speaking: false, videoOn: false, micOn: true, verified: true, isMe: false, inCall: true, source: 'invite', subject: ''
    };
    setMembers(prev => [...prev, guestMember]);
    setChatMsgs(prev => [...prev, { id: Date.now(), sender: 'System', avatar: '🔑', text: `${gname} joined via invite code.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isMe: false, isSystem: true }]);
    setGuestJoining(false);
    setGuestName('');
    if (window.location.hash) { window.history.replaceState(null, '', window.location.pathname); }
  };

  // ============== TIMER ==============
  useEffect(() => {
    const t = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ============== CAMERA ==============
  useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = stream;
        stream.getVideoTracks().forEach(t => { t.enabled = false; });
        stream.getAudioTracks().forEach(t => { t.enabled = false; });
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (e) {
        console.log('Camera error:', e);
        setVideoEnabled(false);
        setMembers(prev => prev.map(m => m.id === 'me' ? { ...m, videoOn: false } : m));
      }
    })();
    return () => { if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; } };
  }, []);

  useEffect(() => {
    if (videoEnabled && localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [videoEnabled]);

  useEffect(() => {
    const vt = localStreamRef.current?.getVideoTracks()[0];
    if (vt) vt.enabled = videoEnabled;
  }, [videoEnabled]);

  useEffect(() => {
    const at = localStreamRef.current?.getAudioTracks()[0];
    if (at) at.enabled = audioEnabled;
  }, [audioEnabled]);

  // ============== TRANSCRIPT SIMULATION ==============
  useEffect(() => {
    if (!isTranscribing) return;
    const interval = setInterval(() => {
      if (txIdx.current < TX.length) {
        const line = TX[txIdx.current];
        setTranscriptLines(prev => [...prev, { ...line, time: fmtTime(duration), id: Date.now() }]);
        setMembers(prev => prev.map(m => {
          if (m.name === line.speaker) return { ...m, speaking: true };
          return m;
        }));
        setTimeout(() => {
          setMembers(prev => prev.map(m => ({ ...m, speaking: false })));
        }, 2500);
        txIdx.current++;
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [isTranscribing, duration]);

  // ============== SCROLL CHAT ==============
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);

  // ============== ACTIONS ==============
  const toggleVideo = useCallback(() => {
    // 1) If we already have a local stream, toggle its video track
    let vt = localStreamRef.current?.getVideoTracks()[0];
    if (vt) {
      const newState = !vt.enabled;
      vt.enabled = newState;
      setVideoEnabled(newState);
      setMembers(prev => prev.map(m => m.id === 'me' ? { ...m, videoOn: newState } : m));
      return;
    }
    // 2) No stream yet — attempt to acquire camera
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
        // Stop any existing tracks first
        if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); }
        localStreamRef.current = stream;
        const videoTrack = stream.getVideoTracks()[0];
        videoTrack.enabled = true;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setVideoEnabled(true);
        setMembers(prev => prev.map(m => m.id === 'me' ? { ...m, videoOn: true } : m));
        // If there's an audio track too, enable it
        const at = stream.getAudioTracks()[0];
        if (at) { at.enabled = audioEnabled; }
      } catch (e) {
        console.log('Camera error on toggle:', e);
        setVideoEnabled(false);
        setMembers(prev => prev.map(m => m.id === 'me' ? { ...m, videoOn: false } : m));
        // Show a subtle UI hint: camera is unavailable
      }
    })();
  }, [audioEnabled]);
  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    setMembers(prev => prev.map(m => m.id === 'me' ? { ...m, micOn: !audioEnabled } : m));
  };

  // ============== SPEECH TO TEXT (STT) ==============
  const [isSTTActive, setIsSTTActive] = useState(false);
  const sttRecognitionRef = useRef(null);

  const toggleSTT = () => {
    if (isSTTActive) {
      sttRecognitionRef.current?.stop();
      setIsSTTActive(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Use Chrome or Edge.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      // Show interim in chat input
      if (final || interim) setChatMsg(prev => (prev || '') + final + (interim ? interim : ''));
    };
    recognition.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      setIsSTTActive(false);
    };
    recognition.onend = () => { if (isSTTActive) recognition.start(); };
    recognition.start();
    sttRecognitionRef.current = recognition;
    setIsSTTActive(true);
  };

  // ============== TEXT TO SPEECH (TTS) ==============
  const [isTTSActive, setIsTTSActive] = useState(false);
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setIsTTSActive(false);
    window.speechSynthesis.speak(utterance);
    setIsTTSActive(true);
  };
  const toggleTTS = () => {
    if (isTTSActive) { window.speechSynthesis?.cancel(); setIsTTSActive(false); return; }
    // Read the latest transcript line
    const lastLine = transcriptLines[transcriptLines.length - 1];
    if (lastLine) speakText(lastLine.en);
  };

  // Cleanup STT on leave
  useEffect(() => () => { sttRecognitionRef.current?.stop(); window.speechSynthesis?.cancel(); }, []);

  const toggleScreenShare = async () => {
    if (screenSharing) {
      screenStream?.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        if (screenVideoRef.current) screenVideoRef.current.srcObject = stream;
        setScreenSharing(true);
        stream.getVideoTracks()[0].onended = () => { setScreenSharing(false); setScreenStream(null); };
      } catch (e) { }
    }
  };

  const sendChat = () => {
    if (!chatMsg.trim()) return;
    const msg = { id: Date.now(), sender: 'You', avatar: _av, text: chatMsg.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isMe: true, isSystem: false };
    setChatMsgs(prev => [...prev, msg]);
    setChatMsg('');
  };

  const sendEmoji = (emoji) => {
    const msg = { id: Date.now(), sender: 'You', avatar: _av, text: emoji, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isMe: true, isEmoji: true, isSystem: false };
    setChatMsgs(prev => [...prev, msg]);
    setShowEmojiPicker(false);
  };

  const togglePanel = (p) => setActivePanel(prev => prev === p ? null : p);

  const handleLeave = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStream?.getTracks().forEach(t => t.stop());
    onLeave?.();
  };

  const callMember = (member) => {
    if (member.isMe) return;
    setCallingMember(member);
    setRinging(true);
    setTimeout(() => {
      setRinging(false);
      setCallingMember(null);
      setMembers(prev => {
        const exists = prev.find(m => m.id === member.id);
        if (exists) {
          return prev.map(m => m.id === member.id ? { ...m, status: 'active', inCall: true } : m);
        }
        return [...prev, {
          id: member.id, name: member.name, avatar: member.avatar || '👤', role: member.role || 'Participant',
          subject: member.subject || '', speaking: false, videoOn: true, micOn: true,
          verified: !!member.verified, status: 'active', inCall: true, isMe: false
        }];
      });
      setChatMsgs(prev => [...prev, {
        id: Date.now(), sender: 'System', avatar: '📞', text: `${member.name} joined the call.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isMe: false, isSystem: true
      }]);
    }, 2500);
  };

  const availableContacts = contacts.filter(c => !members.some(m => m.id === c.id));
  const filteredAvailable = availableContacts.filter(c => {
    const q = contactSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.role || '').toLowerCase().includes(q) || (c.subject || '').toLowerCase().includes(q);
  });

  const removeMember = (memberId) => {
    setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  // ============== CONTACT MANAGEMENT ==============
  const AVATAR_MAP = { Student: '👦', Teacher: '👩‍🏫', Parent: '👨‍👩‍👧' };
  const addContact = () => {
    const n = (newContact.name || '').trim();
    if (!n) return;
    const c = { id: `manual-${Date.now()}`, name: n, role: newContact.role || 'Student', email: (newContact.email || '').trim(), subject: (newContact.subject || '').trim(), avatar: AVATAR_MAP[newContact.role] || '👤', status: 'active', source: 'manual' };
    const updated = [c, ...contacts];
    setContacts(updated);
    persistVideoRoomContacts(updated);
    setNewContact({ name: '', role: 'Student', email: '', subject: '' });
    setShowAddContactForm(false);
  };
  const removeContact = (contactId) => {
    const updated = contacts.filter(c => c.id !== contactId);
    setContacts(updated);
    persistVideoRoomContacts(updated);
    addRemovedId(contactId);
  };

  // ============== LAYOUT HELPERS ==============
  const EMOJIS = ['👍', '❤️', '😂', '🎉', '👏', '🔥', '😮', '🤔'];

  // Compute grid columns based on count
  const gridCount = members.length;
  const getGridCols = (n) => {
    if (n <= 1) return 1;
    if (n <= 2) return 2;
    if (n <= 4) return 2;
    return 3;
  };

  // For speaker view: pick pinned or speaking member as main
  const speakerMember = pinnedMember || members.find(m => m.speaking && !m.isMe) || members[0];
  const speakerOthers = members.filter(m => m !== speakerMember);

  return (
    <div className="vroom">
      {/* ========== TOP BAR ========== */}
      <header className="vr-top">
        <div className="vr-top-left">
          <div className="vr-top-logo">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          </div>
          <span className="vr-top-title">Meeting details</span>
          <span className="vr-top-timer">{fmtTime(duration)}</span>
          <span className="vr-top-dot" />
          <I.Signal size={13} style={{ color: '#34c759' }} />
          <I.Security size={13} style={{ color: '#8e8e93' }} />
          <button className="vr-top-icon" title="Copy meeting info" onClick={() => copyToClipboard(meetingId, 'id')}>
            <I.Copy size={13} />
          </button>
        </div>
        <div className="vr-top-right">
          {/* Layout switcher */}
          <div className="vr-layout-menu-wrap">
            <button className="vr-top-btn" onClick={() => setShowLayoutMenu(!showLayoutMenu)}>
              <I.Layout size={14} />
              <span>{layoutMode === 'grid' ? 'Grid Layout' : layoutMode === 'speaker' ? 'Speaker View' : 'Spotlight'}</span>
              <I.ChevronDown size={10} />
            </button>
            {showLayoutMenu && (
              <div className="vr-layout-dropdown">
                <div className={`vr-layout-item ${layoutMode === 'grid' ? 'vr-layout-active' : ''}`} onClick={() => { setLayoutMode('grid'); setShowLayoutMenu(false); }}>
                  <I.Layout size={14} /> Grid Layout
                </div>
                <div className={`vr-layout-item ${layoutMode === 'speaker' ? 'vr-layout-active' : ''}`} onClick={() => { setLayoutMode('speaker'); setShowLayoutMenu(false); }}>
                  <I.Screen size={14} /> Speaker View
                </div>
                <div className={`vr-layout-item ${layoutMode === 'spotlight' ? 'vr-layout-active' : ''}`} onClick={() => { setLayoutMode('spotlight'); setShowLayoutMenu(false); }}>
                  <I.Sparkle size={14} /> Spotlight
                </div>
              </div>
            )}
          </div>
          <button className="vr-top-btn">
            <I.Crown size={13} />
            <span>Host Tools</span>
            <I.ChevronDown size={10} />
          </button>
          <button className="vr-top-btn vr-top-btn-solo" title="Settings">
            <I.Settings size={14} />
          </button>
          <div className="vr-top-sep" />
          <button className="vr-top-win" title="Minimize"><I.WindowMin size={11} /></button>
          <button className="vr-top-win" title="Maximize"><I.WindowMax size={11} /></button>
          <button className="vr-top-win vr-top-close" title="Close" onClick={handleLeave}><I.Close size={11} /></button>
        </div>
      </header>

      {/* ========== MAIN BODY ========== */}
      <div className="vr-body">
        <div className="vr-video-zone" style={{ marginRight: activePanel ? 340 : 0 }}>
          {/* SCREEN SHARE */}
          {screenSharing && (
            <div className="vr-screen-overlay">
              <video ref={screenVideoRef} autoPlay playsInline className="vr-screen-vid" />
              <div className="vr-screen-badge"><I.Screen size={12} /> Sharing screen</div>
            </div>
          )}

          {/* GRID LAYOUT */}
          {layoutMode === 'grid' && !screenSharing && (
            <div className="vr-grid-wrap">
              <div className="vr-grid" style={{
                gridTemplateColumns: `repeat(${getGridCols(gridCount)}, 1fr)`,
                maxWidth: gridCount <= 2 ? 900 : gridCount <= 4 ? 1100 : 1300,
              }}>
                {members.map(m => (
                  <VideoTile
                    key={m.id}
                    member={m}
                    isMe={m.isMe}
                    _name={_name}
                    _av={_av}
                    videoEnabled={videoEnabled}
                    localVideoRef={m.isMe ? localVideoRef : null}
                    onPinned={!m.isMe ? () => setPinnedMember(m) : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SPEAKER VIEW */}
          {layoutMode === 'speaker' && !screenSharing && (
            <div className="vr-speaker-wrap">
              <div className="vr-speaker-main">
                <VideoTile member={speakerMember} isMe={speakerMember.isMe} _name={_name} _av={_av} videoEnabled={videoEnabled} localVideoRef={speakerMember.isMe ? localVideoRef : null} size="main" />
                {pinnedMember && (
                  <button className="vr-unpin-btn" onClick={() => setPinnedMember(null)}>Unpin</button>
                )}
              </div>
              <div className="vr-speaker-strip">
                {speakerOthers.map(m => (
                  <VideoTile key={m.id} member={m} isMe={m.isMe} _name={_name} _av={_av} videoEnabled={videoEnabled} localVideoRef={m.isMe ? localVideoRef : null} size="thumb" onPinned={() => setPinnedMember(m)} />
                ))}
              </div>
            </div>
          )}

          {/* SPOTLIGHT VIEW */}
          {layoutMode === 'spotlight' && !screenSharing && (
            <div className="vr-spotlight-wrap">
              <div className="vr-spotlight-main">
                <VideoTile member={speakerMember} isMe={speakerMember.isMe} _name={_name} _av={_av} videoEnabled={videoEnabled} localVideoRef={speakerMember.isMe ? localVideoRef : null} size="main" />
                {pinnedMember && (
                  <button className="vr-unpin-btn" onClick={() => setPinnedMember(null)}>Unpin</button>
                )}
              </div>
              <div className="vr-spotlight-strip">
                {speakerOthers.map(m => (
                  <VideoTile key={m.id} member={m} isMe={m.isMe} _name={_name} _av={_av} videoEnabled={videoEnabled} localVideoRef={m.isMe ? localVideoRef : null} size="side" onPinned={() => setPinnedMember(m)} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========== SIDE PANEL ========== */}
        {activePanel && (
          <aside className="vr-panel">
            {/* Members Panel */}
            {activePanel === 'members' && (
              <>
                <div className="vr-panel-hd">
                  <div className="vr-panel-ttl"><I.Members size={16} /> Participants ({members.length})</div>
                  <button className="vr-panel-x" onClick={() => setActivePanel(null)}><I.Close size={14} /></button>
                </div>
                <div className="vr-panel-srch">
                  <I.Search size={14} style={{ color: '#8e8e93' }} />
                  <input placeholder="Search participants" />
                </div>
                <div className="vr-mem-list">
                  {members.map(m => (
                    <div key={m.id} className={`vr-mem-row ${m.isMe ? 'vr-mem-me' : ''}`}>
                      <div className="vr-mem-av">
                        <span style={{ fontSize: 28 }}>{m.isMe ? _av : m.avatar}</span>
                        <span className="vr-mem-dot" style={{ background: m.speaking ? '#34c759' : '#8e8e93' }} />
                      </div>
                      <div className="vr-mem-info">
                        <span className="vr-mem-name">{m.isMe ? `${_name}` : m.name}{m.role === 'Host' && <I.Crown size={10} style={{ color: '#ff9f0a', marginLeft: 4 }} />}</span>
                        <span className="vr-mem-sub">{m.isMe ? 'Host · Host' : (m.role || 'Participant')}{m.subject ? ` · ${m.subject}` : ''}</span>
                      </div>
                      <div className="vr-mem-actions">
                        {m.micOn ? <I.Mic size={14} style={{ color: '#8e8e93' }} /> : <I.MicOff size={14} style={{ color: '#ff3b30' }} />}
                        {m.videoOn ? <I.Camera size={14} style={{ color: '#8e8e93' }} /> : <I.CameraOff size={14} style={{ color: '#8e8e93' }} />}
                        {!m.isMe && !m.id?.startsWith?.('demo-') && (
                          <button className="vr-mem-rm" onClick={() => removeMember(m.id)}><I.Close size={12} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="vr-mem-div">
                    <span>Add from Contacts</span>
                    <span className="vr-mem-div-cnt">{availableContacts.length} available</span>
                  </div>
                  <div className="vr-panel-srch" style={{ marginTop: 0 }}>
                    <I.Search size={14} style={{ color: '#8e8e93' }} />
                    <input placeholder="Search contacts..." value={contactSearch} onChange={e => setContactSearch(e.target.value)} />
                    <button onClick={() => setShowAddContactForm(!showAddContactForm)} title="Add contact" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007aff', padding: 2 }}>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                    </button>
                  </div>
                  {showAddContactForm && (
                    <div className="vr-add-form">
                      <input placeholder="Name *" value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} />
                      <select value={newContact.role} onChange={e => setNewContact({ ...newContact, role: e.target.value })}>
                        <option value="Student">Student</option><option value="Teacher">Teacher</option><option value="Parent">Parent</option>
                      </select>
                      <input placeholder="Email (optional)" value={newContact.email} onChange={e => setNewContact({ ...newContact, email: e.target.value })} />
                      <input placeholder="Subject (optional)" value={newContact.subject} onChange={e => setNewContact({ ...newContact, subject: e.target.value })} />
                      <div className="vr-add-acts">
                        <button className="vr-add-save" onClick={addContact}>Add Contact</button>
                        <button className="vr-add-cancel" onClick={() => { setShowAddContactForm(false); setNewContact({ name: '', role: 'Student', email: '', subject: '' }); }}>Cancel</button>
                      </div>
                    </div>
                  )}
                  {filteredAvailable.length === 0 ? (
                    <div className="vr-no-cts">
                      <span style={{ fontSize: 28, opacity: 0.4 }}>📋</span>
                      <span style={{ fontSize: 12, color: '#8e8e93', marginTop: 6 }}>
                        {contactSearch ? 'No contacts match' : contacts.length === 0 ? 'No contacts yet' : 'All contacts in call'}
                      </span>
                    </div>
                  ) : (
                    filteredAvailable.map(c => (
                      <div key={c.id} className="vr-mem-row vr-mem-ct" onClick={() => callMember(c)}>
                        <div className="vr-mem-av"><span style={{ fontSize: 28 }}>{c.avatar}</span></div>
                        <div className="vr-mem-info">
                          <span className="vr-mem-name">{c.name}</span>
                          <span className="vr-mem-sub">{c.role}{c.subject ? ` · ${c.subject}` : ''}</span>
                        </div>
                        <div className="vr-mem-actions">
                          <button className="vr-mem-call" onClick={(e) => { e.stopPropagation(); callMember(c); }}><I.VideoCall size={14} /></button>
                          <button className="vr-mem-rm" onClick={(e) => { e.stopPropagation(); removeContact(c.id); }}><I.Close size={12} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Chat Panel */}
            {activePanel === 'chat' && (
              <>
                <div className="vr-panel-hd">
                  <div className="vr-panel-ttl"><I.Chat size={16} /> Chat</div>
                  <button className="vr-panel-x" onClick={() => setActivePanel(null)}><I.Close size={14} /></button>
                </div>
                <div className="vr-chat-body">
                  <div className="vr-chat-msgs">
                    {chatMsgs.map(m => (
                      <div key={m.id} className={`vr-msg ${m.isMe ? 'vr-msg-me' : ''} ${m.isSystem ? 'vr-msg-sys' : ''}`}>
                        {!m.isSystem && <span className="vr-msg-av">{m.avatar}</span>}
                        <div className="vr-msg-bub">
                          {!m.isSystem && <span className="vr-msg-from">{m.sender}</span>}
                          <span className={`vr-msg-txt ${m.isEmoji ? 'vr-msg-emoji' : ''}`}>{m.text}</span>
                          {!m.isSystem && <span className="vr-msg-ts">{m.time}</span>}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="vr-chat-inp">
                    <input placeholder="Send a message to everyone..." value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} />
                    <button onClick={sendChat}><I.Send size={16} /></button>
                  </div>
                </div>
              </>
            )}

            {/* Yuanbao Minutes / Transcript */}
            {activePanel === 'transcript' && (
              <>
                <div className="vr-panel-hd">
                  <div className="vr-panel-ttl"><I.Sparkle size={16} style={{ color: '#007aff' }} /> Yuanbao Minutes</div>
                  <div className="vr-panel-actr">
                    <button className={`vr-tran-toggle ${showTranslation ? 'vr-tran-on' : ''}`} onClick={() => setShowTranslation(!showTranslation)}>
                      <I.Translate size={12} /> {showTranslation ? '中文' : 'EN'}
                    </button>
                    <button className="vr-panel-x" onClick={() => setActivePanel(null)}><I.Close size={14} /></button>
                  </div>
                </div>
                <div className="vr-tran-body">
                  {/* AI Summary */}
                  <div className="vr-ai-box">
                    <div className="vr-ai-head"><I.Sparkle size={13} style={{ color: '#007aff' }} /> Real-time summary</div>
                    {aiSummary.map((item, idx) => (
                      <div key={idx} className="vr-ai-item">
                        <div className="vr-ai-togg" onClick={() => setAiSummary(prev => prev.map((s, i) => i === idx ? { ...s, expanded: !s.expanded } : s))}>
                          <span>{item.title}</span>
                          {item.expanded ? <I.ChevronUp size={12} /> : <I.ChevronDown size={12} />}
                        </div>
                        {item.expanded && <div className="vr-ai-text">{item.content}</div>}
                      </div>
                    ))}
                    <div className="vr-ai-sep" />
                    <div className="vr-ai-feat"><I.Check size={12} style={{ color: '#34c759' }} /> Distinguish participating speakers</div>
                  </div>
                  {/* Live Transcript */}
                  <div className="vr-tran-live">
                    {isTranscribing && <div className="vr-tran-ind"><span className="vr-pulse" /> Transcribing live</div>}
                    {transcriptLines.map(line => (
                      <div key={line.id} className="vr-tran-line">
                        <div className="vr-tran-hd"><span className="vr-tran-spk">{line.speaker}</span><span className="vr-tran-tm">{line.time}</span></div>
                        <p className="vr-tran-txt">{showTranslation ? line.zh : line.en}</p>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  {/* AI Secretary */}
                  <div className="vr-ai-bot">
                    <div className="vr-ai-bot-av">🤖</div>
                    <div className="vr-ai-bot-info"><span>WeMeet Secretary</span><small>AI-powered meeting assistant</small></div>
                    <button className="vr-ai-bot-btn">Summary now</button>
                  </div>
                </div>
              </>
            )}

            {/* Invite Panel */}
            {activePanel === 'invite' && (
              <>
                <div className="vr-panel-hd">
                  <div className="vr-panel-ttl"><I.Invite size={16} /> Invite to Room</div>
                  <button className="vr-panel-x" onClick={() => setActivePanel(null)}><I.Close size={14} /></button>
                </div>
                <div className="vr-inv-body">
                  {/* Option 1 — Invite from Contacts */}
                  <div className="vr-inv-sect">
                    <h4 className="vr-inv-lbl"><I.Members size={12} /> Option 1 — Invite from Contacts</h4>
                    <p className="vr-inv-desc">Click a contact below to invite them into the room.</p>
                    <div className="vr-panel-srch" style={{ margin: '0 0 6px', padding: '6px 10px' }}>
                      <I.Search size={13} style={{ color: '#8e8e93' }} />
                      <input placeholder="Search contacts..." value={contactSearch} onChange={e => setContactSearch(e.target.value)} style={{ fontSize: 11 }} />
                    </div>
                    <div className="vr-inv-ct-list">
                      {filteredAvailable.length === 0 ? (
                        <div className="vr-no-cts">
                          <span style={{ fontSize: 24, opacity: 0.4 }}>📋</span>
                          <span style={{ fontSize: 11, color: '#8e8e93', marginTop: 4 }}>
                            {contactSearch ? 'No contacts match' : contacts.length === 0 ? 'No contacts yet' : 'All contacts are already in the room'}
                          </span>
                        </div>
                      ) : (
                        filteredAvailable.slice(0, 6).map(c => (
                          <div key={c.id} className="vr-inv-ct-row" onClick={() => callMember(c)}>
                            <span className="vr-inv-ct-av">{c.avatar}</span>
                            <div className="vr-inv-ct-info">
                              <span className="vr-inv-ct-name">{c.name}</span>
                              <span className="vr-inv-ct-sub">{c.role}{c.subject ? ` · ${c.subject}` : ''}</span>
                            </div>
                            <button className="vr-inv-ct-call" onClick={(e) => { e.stopPropagation(); callMember(c); }}>
                              <I.VideoCall size={12} /> Invite
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    {filteredAvailable.length > 6 && (
                      <button className="vr-inv-seeall" onClick={() => setActivePanel('members')}>See all contacts →</button>
                    )}
                  </div>

                  <div className="vr-inv-sep-or"><span>or</span></div>

                  {/* Option 2 — By Code / Link */}
                  <div className="vr-inv-sect vr-inv-hl">
                    <h4 className="vr-inv-lbl"><I.Lock size={13} /> Option 2 — Invite by Code</h4>
                    <p className="vr-inv-desc">Share this 6-digit code or link. Anyone can join — no account needed.</p>
                    <div className="vr-inv-big">{inviteCode}</div>
                    <div className="vr-inv-btns">
                      <button className="vr-inv-cpy vr-inv-cpy-big" onClick={() => copyToClipboard(inviteCode, 'code')}>
                        {inviteCopied === 'code' ? <><I.Check size={12} /> Copied!</> : <><I.Copy size={12} /> Copy Code</>}
                      </button>
                      <button className="vr-inv-cpy vr-inv-cpy-big" onClick={() => copyToClipboard(inviteLink, 'link')}>
                        {inviteCopied === 'link' ? <><I.Check size={12} /> Copied!</> : <><I.Share size={12} /> Copy Link</>}
                      </button>
                    </div>
                    <button className="vr-inv-ref" onClick={regenerateCode}><I.Refresh size={12} /> Generate New Code</button>
                  </div>

                  <div className="vr-inv-steps">
                    <h4 className="vr-inv-lbl">How participants join</h4>
                    <div className="vr-inv-step"><span className="vr-inv-num">1</span>Share the <strong>code</strong> or <strong>link</strong> (WhatsApp, SMS, email)</div>
                    <div className="vr-inv-step"><span className="vr-inv-num">2</span>They open the link or enter code on the dashboard <strong>Join a Room</strong> box</div>
                    <div className="vr-inv-step"><span className="vr-inv-num">3</span>They enter their name and join instantly as a <strong>verified guest</strong></div>
                  </div>

                  <div className="vr-inv-test">
                    <h4 className="vr-inv-lbl">Quick Test — Simulate Guest</h4>
                    <div className="vr-inv-test-row">
                      <input placeholder="Guest name..." value={guestName} onChange={e => setGuestName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGuestJoin()} className="vr-inv-test-inp" />
                      <button className="vr-inv-test-btn" onClick={handleGuestJoin} disabled={!guestName.trim()}><I.VideoCall size={14} /> Join as Guest</button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* More Panel */}
            {activePanel === 'more' && (
              <>
                <div className="vr-panel-hd">
                  <div className="vr-panel-ttl"><I.Apps size={16} /> More</div>
                  <button className="vr-panel-x" onClick={() => setActivePanel(null)}><I.Close size={14} /></button>
                </div>
                <div className="vr-more-body">
                  <button className={`vr-more-item ${isRecording ? 'vr-more-on' : ''}`} onClick={() => setIsRecording(!isRecording)}>
                    <span className="vr-more-ico" style={isRecording ? { color: '#ff3b30' } : {}}><I.Record size={20} /></span>
                    <div className="vr-more-txt"><strong>Record</strong><small>{isRecording ? 'Recording…' : 'Start recording'}</small></div>
                  </button>
                  <button className={`vr-more-item ${isTranscribing ? 'vr-more-on' : ''}`} onClick={() => setIsTranscribing(!isTranscribing)}>
                    <span className="vr-more-ico"><I.Caption size={20} /></span>
                    <div className="vr-more-txt"><strong>Transcription</strong><small>{isTranscribing ? 'On · AI captions' : 'Turn on captions'}</small></div>
                  </button>
                  <button className="vr-more-item">
                    <span className="vr-more-ico"><I.Poll size={20} /></span>
                    <div className="vr-more-txt"><strong>Poll / Vote</strong><small>Create a quick poll</small></div>
                  </button>
                  <button className="vr-more-item" onClick={() => setShowTranslation(!showTranslation)}>
                    <span className="vr-more-ico"><I.Translate size={20} /></span>
                    <div className="vr-more-txt"><strong>Translation</strong><small>{showTranslation ? 'Chinese → English' : 'English → Chinese'}</small></div>
                  </button>
                  <button className="vr-more-item" onClick={() => togglePanel('invite')}>
                    <span className="vr-more-ico"><I.Invite size={20} /></span>
                    <div className="vr-more-txt"><strong>Invite</strong><small>Share room code & link</small></div>
                  </button>
                </div>
              </>
            )}
          </aside>
        )}
      </div>

      {/* ========== BOTTOM TOOLBAR (Tencent Meeting Style) ========== */}
      <div className="vr-bar-wrap">
        <div className="vr-bar">
          {/* Left: Emoji + Hand */}
          <div className="vr-bar-seg">
            <div className="vr-bar-emoji-wrap">
              <button className="vr-bar-btn-sm" onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Reactions">
                <I.Emoji size={18} />
              </button>
              {showEmojiPicker && (
                <div className="vr-emoji-pop">
                  {EMOJIS.map(e => <button key={e} className="vr-emoji-itm" onClick={() => sendEmoji(e)}>{e}</button>)}
                </div>
              )}
            </div>
            <button className={`vr-bar-btn-sm ${handRaised ? 'vr-bar-act' : ''}`} onClick={() => setHandRaised(!handRaised)} title="Raise Hand">
              <I.Hand size={18} />
            </button>
            <button className={`vr-bar-btn-sm ${isSTTActive ? 'vr-bar-act' : ''}`} onClick={toggleSTT} title={isSTTActive ? 'Stop speech-to-text' : 'Speech to Text'}>
              <I.Caption size={18} style={isSTTActive ? { color: '#34c759' } : {}} />
            </button>
            <button className={`vr-bar-btn-sm ${isTTSActive ? 'vr-bar-act' : ''}`} onClick={toggleTTS} title={isTTSActive ? 'Stop TTS' : 'Text to Speech — Read latest transcript'}>
              <I.Speaker size={18} style={isTTSActive ? { color: '#007aff' } : {}} />
            </button>
          </div>

          <div className="vr-bar-div" />

          {/* Center: Mute, Video, Share, Invite */}
          <div className="vr-bar-seg">
            <button className={`vr-bar-btn ${!audioEnabled ? 'vr-bar-off' : ''}`} onClick={toggleAudio}>
              {audioEnabled ? <I.Mic size={20} /> : <I.MicOff size={20} />}
              <span className="vr-bar-txt">Mute</span>
            </button>
            <button className={`vr-bar-btn ${!videoEnabled ? 'vr-bar-off' : ''}`} onClick={toggleVideo}>
              {videoEnabled ? <I.Camera size={20} /> : <I.CameraOff size={20} />}
              <span className="vr-bar-txt">{videoEnabled ? 'Stop Video' : 'Start Video'}</span>
            </button>
            <button className={`vr-bar-btn ${screenSharing ? 'vr-bar-act' : ''}`} onClick={toggleScreenShare}>
              <I.Screen size={20} />
              <span className="vr-bar-txt">Share Screen</span>
            </button>
            <button className="vr-bar-btn" onClick={() => togglePanel('invite')}>
              <I.Invite size={20} />
              <span className="vr-bar-txt">Invite</span>
            </button>
          </div>

          <div className="vr-bar-div" />

          {/* Right: Attendees, Chat, Record, Minutes, App */}
          <div className="vr-bar-seg">
            <button className={`vr-bar-btn ${activePanel === 'members' ? 'vr-bar-act' : ''}`} onClick={() => togglePanel('members')}>
              <I.Members size={20} />
              <span className="vr-bar-txt">Attendees({members.filter(m => !m.id?.startsWith?.('demo-')).length})</span>
            </button>
            <button className={`vr-bar-btn ${activePanel === 'chat' ? 'vr-bar-act' : ''}`} onClick={() => togglePanel('chat')}>
              <I.Chat size={20} />
              <span className="vr-bar-txt">Chat</span>
              {chatMsgs.filter(m => !m.isSystem).length > 0 && <span className="vr-bar-badge">{chatMsgs.filter(m => !m.isSystem).length}</span>}
            </button>
            <button className={`vr-bar-btn ${isRecording ? 'vr-bar-act' : ''}`} onClick={() => setIsRecording(!isRecording)}>
              <I.Record size={20} style={isRecording ? { color: '#ff3b30' } : {}} />
              <span className="vr-bar-txt">Record</span>
            </button>
            <button className={`vr-bar-btn ${activePanel === 'transcript' ? 'vr-bar-act' : ''}`} onClick={() => togglePanel('transcript')}>
              <I.Sparkle size={20} />
              <span className="vr-bar-txt">Yuanbao Minutes</span>
            </button>
            <button className={`vr-bar-btn ${activePanel === 'more' ? 'vr-bar-act' : ''}`} onClick={() => togglePanel('more')}>
              <I.Apps size={20} />
              <span className="vr-bar-txt">App</span>
            </button>
            <button className={`vr-bar-btn ${showWhiteboard ? 'vr-bar-act' : ''}`} onClick={() => setShowWhiteboard(!showWhiteboard)}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M3 3h18v14H3V3zm16 12V5H5v10h14zM3 21h18v-2H3v2z"/></svg>
              <span className="vr-bar-txt">Board</span>
            </button>
          </div>

          <div className="vr-bar-div" />

          {/* End call */}
          <button className="vr-bar-end" onClick={handleLeave}>
            <span>End</span>
          </button>
        </div>
      </div>

      {/* ========== GUEST JOIN OVERLAY ========== */}
      {guestJoining && (
        <div className="vr-overlay">
          <div className="vr-guest-card">
            <span className="vr-guest-ico">🔑</span>
            <h2>You've been invited!</h2>
            <p className="vr-guest-sub">Room code: <strong>{inviteCode}</strong></p>
            <p className="vr-guest-desc">Enter your name to join the video classroom.</p>
            <input ref={guestInputRef} className="vr-guest-inp" placeholder="Your name" value={guestName} onChange={e => setGuestName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGuestJoin()} autoFocus />
            <div className="vr-guest-acts">
              <button className="vr-guest-join" onClick={handleGuestJoin} disabled={!guestName.trim()}><I.VideoCall size={16} /> Join Room</button>
              <button className="vr-guest-cancel" onClick={() => { setGuestJoining(false); setGuestName(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== WHITEBOARD OVERLAY ========== */}
      {showWhiteboard && (
        <div className="vr-wb-overlay">
          <div className="vr-wb-toolbar">
            <button className={`vr-wb-tool ${wbTool === 'pen' ? 'vr-wb-active' : ''}`} onClick={() => setWbTool('pen')} title="Pen">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            <button className={`vr-wb-tool ${wbTool === 'eraser' ? 'vr-wb-active' : ''}`} onClick={() => setWbTool('eraser')} title="Eraser">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53c-.78.78-1.92.78-2.7 0L9.3 20.53l-2.83 2.83H2.88l8.34-8.34-1.41-1.41-4.95 4.95-1.41-1.41 4.95-4.95L7 10.86 2.05 15.8c-.78.79-.78 2.05 0 2.84l4.95 4.94c.78.78 2.05.78 2.83 0l9.36-9.35c.78-.79.78-2.05 0-2.84l-2.95-2.99z"/></svg>
            </button>
            <div className="vr-wb-sep" />
            {WB_COLORS.map(c => (
              <button key={c} className="vr-wb-color" style={{ background: c, outline: wbColor === c && wbTool === 'pen' ? '2px solid #007aff' : 'none', outlineOffset: 2 }} onClick={() => { setWbColor(c); setWbTool('pen'); }} />
            ))}
            <div className="vr-wb-sep" />
            {WB_SIZES.map(s => (
              <button key={s} className={`vr-wb-sz ${wbLineWidth === s ? 'vr-wb-sz-act' : ''}`} onClick={() => setWbLineWidth(s)}>
                <span style={{ width: s * 3, height: s * 3, borderRadius: '50%', background: '#1d1d1f' }} />
              </button>
            ))}
            <div className="vr-wb-sep" />
            <button className="vr-wb-tool" onClick={wbToggleBg} title={wbBg === '#ffffff' ? 'Switch to Blackboard' : 'Switch to Whiteboard'}>
              {wbBg === '#ffffff' ? '◼' : '◻'}
            </button>
            <button className="vr-wb-tool" onClick={wbClear} title="Clear All">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
            <div className="vr-wb-sep" />
            <button className="vr-wb-tool vr-wb-close" onClick={() => setShowWhiteboard(false)} title="Close Whiteboard">
              <I.Close size={16} />
            </button>
          </div>
          <div className="vr-wb-canvas-wrap" style={{ background: wbBg }}>
            <canvas
              ref={wbCanvasRef}
              className="vr-wb-canvas"
              onMouseDown={wbStart}
              onMouseMove={wbMove}
              onMouseUp={wbEnd}
              onMouseLeave={wbEnd}
              onTouchStart={wbStart}
              onTouchMove={wbMove}
              onTouchEnd={wbEnd}
            />
          </div>
        </div>
      )}

      {/* ========== RINGING OVERLAY ========== */}
      {ringing && callingMember && (
        <div className="vr-overlay">
          <div className="vr-ring-card">
            <span className="vr-ring-av">{callingMember.avatar}</span>
            <h2>{callingMember.name}</h2>
            <p>Calling...</p>
            <div className="vr-ring-dots"><span /><span /><span /></div>
            <button className="vr-ring-cancel" onClick={() => { setRinging(false); setCallingMember(null); }}><I.Close size={20} /></button>
          </div>
        </div>
      )}

      {/* ========== STYLES (Complete Rewrite - Tencent Meeting) ========== */}
      <style>{`
/* ========== ROOT ========== */
.vroom{position:fixed;inset:0;background:#f0f2f5;display:flex;flex-direction:column;z-index:200;color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;user-select:none;}

/* ========== TOP BAR ========== */
.vr-top{display:flex;align-items:center;justify-content:space-between;height:36px;padding:0 10px;background:#fff;border-bottom:1px solid #e5e5e7;flex-shrink:0;z-index:10;}
.vr-top-left{display:flex;align-items:center;gap:6px;}
.vr-top-logo{width:20px;height:20px;background:#007aff;border-radius:5px;display:flex;align-items:center;justify-content:center;color:#fff;}
.vr-top-title{font-size:11px;font-weight:500;color:#1d1d1f;}
.vr-top-timer{font-size:10px;color:#8e8e93;margin-left:2px;}
.vr-top-dot{width:3px;height:3px;border-radius:50%;background:#c7c7cc;margin:0 2px;}
.vr-top-icon{display:flex;align-items:center;justify-content:center;width:24px;height:24px;border:none;background:transparent;color:#8e8e93;border-radius:5px;cursor:pointer;transition:all 0.15s;}
.vr-top-icon:hover{background:#f2f2f7;color:#1d1d1f;}

.vr-top-right{display:flex;align-items:center;gap:2px;position:relative;}
.vr-top-btn{display:flex;align-items:center;gap:4px;padding:4px 8px;border:1px solid transparent;background:transparent;color:#1d1d1f;border-radius:5px;cursor:pointer;font-size:11px;transition:all 0.15s;font-family:inherit;}
.vr-top-btn:hover{background:#f2f2f7;}
.vr-top-btn-solo{width:28px;height:28px;padding:0;justify-content:center;}
.vr-top-sep{width:1px;height:14px;background:#e5e5e7;margin:0 4px;}
.vr-top-win{width:26px;height:26px;border:none;background:transparent;color:#8e8e93;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
.vr-top-win:hover{background:#f2f2f7;}
.vr-top-close:hover{background:#ff3b30;color:#fff;}

/* Layout dropdown */
.vr-layout-menu-wrap{position:relative;}
.vr-layout-dropdown{position:absolute;top:100%;left:0;margin-top:4px;background:#fff;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);border:1px solid #e5e5e7;padding:4px;min-width:160px;z-index:50;animation:vr-fade 0.15s;}
@keyframes vr-fade{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.vr-layout-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:6px;cursor:pointer;font-size:12px;color:#1d1d1f;transition:all 0.15s;}
.vr-layout-item:hover{background:#f2f2f7;}
.vr-layout-active{background:#f0f7ff;color:#007aff;font-weight:500;}

/* ========== BODY ========== */
.vr-body{flex:1;display:flex;overflow:hidden;position:relative;}
.vr-video-zone{flex:1;position:relative;display:flex;align-items:center;justify-content:center;padding:8px;transition:margin-right 0.25s;overflow:hidden;}

/* ========== SCREEN SHARE ========== */
.vr-screen-overlay{position:absolute;inset:8px;z-index:5;background:#000;border-radius:12px;overflow:hidden;}
.vr-screen-vid{width:100%;height:100%;object-fit:contain;}
.vr-screen-badge{position:absolute;top:12px;left:12px;padding:6px 12px;background:rgba(0,0,0,0.65);border-radius:6px;font-size:11px;color:#fff;display:flex;align-items:center;gap:6px;backdrop-filter:blur(4px);}

/* ========== GRID LAYOUT ========== */
.vr-grid-wrap{width:100%;height:100%;display:flex;align-items:center;justify-content:center;}
.vr-grid{display:grid;gap:8px;width:100%;max-height:100%;aspect-ratio:16/10;padding:8px;align-content:center;}

/* Grid responsive for 1 person */
.vr-grid:has(.vr-tile:only-child){grid-template-columns:1fr!important;grid-template-rows:1fr!important;max-width:900px;}

/* ========== SPEAKER VIEW ========== */
.vr-speaker-wrap{display:flex;flex-direction:column;height:100%;width:100%;max-width:1100px;}
.vr-speaker-main{flex:1;min-height:0;border-radius:12px;position:relative;background:#e8eaed;margin-bottom:6px;overflow:hidden;}
.vr-speaker-strip{display:flex;gap:6px;justify-content:center;flex-shrink:0;padding:0 4px;overflow-x:auto;}
.vr-unpin-btn{position:absolute;top:10px;right:10px;z-index:6;background:rgba(0,0,0,0.5);border:none;color:#fff;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:10px;backdrop-filter:blur(4px);}

/* ========== SPOTLIGHT VIEW ========== */
.vr-spotlight-wrap{display:flex;gap:6px;height:100%;width:100%;max-width:1200px;max-height:640px;}
.vr-spotlight-main{flex:1;min-width:0;border-radius:12px;background:#e8eaed;position:relative;overflow:hidden;margin-right:2px;}
.vr-spotlight-strip{display:flex;flex-direction:column;gap:4px;width:180px;flex-shrink:0;overflow-y:auto;}

/* ========== VIDEO TILES ========== */
.vr-tile{border-radius:10px;overflow:hidden;position:relative;background:#d5d9de;transition:all 0.2s;aspect-ratio:16/10;}
.vr-tile-spk{outline:2px solid #34c759;outline-offset:-2px;border-radius:10px;}
.vr-tile-vid{width:100%;height:100%;object-fit:cover;}
.vr-tile-bg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#d5d9de,#c4c8cd);}
.vr-tile-emoji{font-size:40px;opacity:0.55;}

/* Thumbnail tile */
.vr-tile-thumb{width:160px;height:100px;flex-shrink:0;cursor:pointer;border-radius:8px;aspect-ratio:unset;}
.vr-tile-thumb:hover{outline:2px solid #007aff;outline-offset:-2px;}

/* Side tile */
.vr-tile-side{width:180px;aspect-ratio:16/10;flex-shrink:0;cursor:pointer;border-radius:8px;}
.vr-tile-side:hover{outline:2px solid #007aff;outline-offset:-2px;}

/* Main tile */
.vr-tile-main{border-radius:12px;aspect-ratio:unset;height:100%;width:100%;}

/* ========== TILE NAME OVERLAY (Tencent Meeting Style) ========== */
.vr-tile-label{position:absolute;bottom:8px;left:8px;display:flex;align-items:center;background:rgba(0,0,0,0.62);border-radius:6px;overflow:hidden;backdrop-filter:blur(8px);max-width:80%;}
.vr-tile-label-bar{width:3px;align-self:stretch;flex-shrink:0;}
.vr-tile-label-body{padding:4px 10px 4px 8px;display:flex;flex-direction:column;min-width:0;}
.vr-tile-label-top{display:flex;align-items:center;gap:3px;}
.vr-tile-label-name{font-size:11px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.vr-tile-label-sub{font-size:9px;color:rgba(255,255,255,0.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3;}
.vr-tile-label-mic{padding:0 8px 0 4px;display:flex;align-items:center;flex-shrink:0;}

/* Thumb tile label (compact) */
.vr-tile-thumb .vr-tile-label{bottom:4px;left:4px;border-radius:4px;}
.vr-tile-thumb .vr-tile-label-body{padding:2px 6px 2px 5px;}
.vr-tile-thumb .vr-tile-label-name{font-size:10px;}
.vr-tile-thumb .vr-tile-label-sub{display:none;}
.vr-tile-thumb .vr-tile-label-mic{padding:0 4px 0 2px;}

/* Side tile label */
.vr-tile-side .vr-tile-label{bottom:4px;left:4px;border-radius:4px;max-width:90%;}
.vr-tile-side .vr-tile-label-body{padding:3px 7px 3px 6px;}
.vr-tile-side .vr-tile-label-name{font-size:10px;}
.vr-tile-side .vr-tile-label-sub{font-size:8px;}
.vr-tile-side .vr-tile-label-mic{padding:0 5px 0 3px;}

/* ========== HD ULTRA BADGE ========== */
.vr-hd-badge{position:absolute;top:10px;right:10px;padding:3px 8px;background:rgba(255,255,255,0.94);border-radius:5px;font-weight:700;color:#1d1d1f;backdrop-filter:blur(4px);border:1px solid rgba(0,0,0,0.08);text-align:center;z-index:4;display:flex;flex-direction:column;align-items:center;line-height:1.1;}
.vr-hd-badge span{font-size:11px;letter-spacing:0.5px;}
.vr-hd-badge small{font-size:7px;letter-spacing:1px;opacity:0.55;font-weight:500;}

/* ========== SIDE PANEL ========== */
.vr-panel{width:340px;background:#fff;border-left:1px solid #e5e5e7;display:flex;flex-direction:column;flex-shrink:0;position:absolute;top:0;right:0;bottom:0;z-index:15;animation:vr-slide 0.18s ease;}
@keyframes vr-slide{from{transform:translateX(16px);opacity:0}to{transform:translateX(0);opacity:1}}
.vr-panel-hd{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #f2f2f7;height:42px;}
.vr-panel-ttl{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:#1d1d1f;}
.vr-panel-actr{display:flex;align-items:center;gap:6px;}
.vr-panel-x{width:28px;height:28px;border:none;background:transparent;color:#8e8e93;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.vr-panel-x:hover{background:#f2f2f7;color:#1d1d1f;}
.vr-panel-srch{display:flex;align-items:center;gap:6px;padding:8px 14px;border-bottom:1px solid #f2f2f7;}
.vr-panel-srch input{flex:1;border:none;background:transparent;font-size:12px;color:#1d1d1f;outline:none;}
.vr-panel-srch input::placeholder{color:#c7c7cc;}

/* ========== MEMBERS LIST ========== */
.vr-mem-list{flex:1;overflow-y:auto;padding:4px 0;}
.vr-mem-row{cursor:pointer;display:flex;align-items:center;gap:8px;padding:7px 14px;transition:background 0.12s;}
.vr-mem-row:hover{background:#f9f9fb;}
.vr-mem-ct:hover{background:#f0f7ff;}
.vr-mem-me{background:#f0f7ff;}
.vr-mem-av{position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.vr-mem-dot{position:absolute;bottom:0;right:0;width:7px;height:7px;border-radius:50%;border:2px solid #fff;}
.vr-mem-info{flex:1;min-width:0;display:flex;flex-direction:column;}
.vr-mem-name{font-size:12px;font-weight:500;color:#1d1d1f;display:flex;align-items:center;}
.vr-mem-sub{font-size:10px;color:#8e8e93;}
.vr-mem-actions{display:flex;align-items:center;gap:6px;flex-shrink:0;}
.vr-mem-call{width:26px;height:26px;border:none;background:#f0f7ff;color:#007aff;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
.vr-mem-call:hover{background:#007aff;color:#fff;}
.vr-mem-rm{width:22px;height:22px;border:none;background:transparent;color:#8e8e93;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
.vr-mem-rm:hover{background:#ff3b30;color:#fff;}

.vr-mem-div{display:flex;align-items:center;justify-content:space-between;padding:10px 14px 4px;font-size:10px;font-weight:600;color:#8e8e93;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #f2f2f7;margin-top:4px;}
.vr-mem-div-cnt{font-weight:400;color:#c7c7cc;text-transform:none;font-size:9px;}
.vr-no-cts{display:flex;flex-direction:column;align-items:center;padding:16px;}

.vr-add-form{display:flex;flex-direction:column;gap:6px;padding:8px 14px 10px;background:#fafafa;border-bottom:1px solid #f2f2f7;}
.vr-add-form input,.vr-add-form select{padding:7px 9px;border:1px solid #e5e5e7;border-radius:6px;font-size:11px;color:#1d1d1f;background:#fff;outline:none;font-family:inherit;}
.vr-add-form input:focus,.vr-add-form select:focus{border-color:#007aff;}
.vr-add-form select{cursor:pointer;}
.vr-add-acts{display:flex;gap:6px;}
.vr-add-save{flex:1;padding:6px 0;border:none;background:#007aff;color:#fff;border-radius:6px;cursor:pointer;font-size:11px;font-weight:500;}
.vr-add-save:hover{background:#0051d5;}
.vr-add-cancel{flex:1;padding:6px 0;border:1px solid #e5e5e7;background:#fff;color:#6e6e73;border-radius:6px;cursor:pointer;font-size:11px;}
.vr-add-cancel:hover{background:#f2f2f7;}

/* ========== CHAT ========== */
.vr-chat-body{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.vr-chat-msgs{flex:1;overflow-y:auto;padding:10px 14px;display:flex;flex-direction:column;gap:8px;}
.vr-msg{display:flex;gap:6px;align-items:flex-start;}
.vr-msg-me{flex-direction:row-reverse;}
.vr-msg-av{font-size:24px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.vr-msg-bub{max-width:75%;padding:7px 10px;background:#f2f2f7;border-radius:12px;display:flex;flex-direction:column;}
.vr-msg-me .vr-msg-bub{background:#007aff;}
.vr-msg-from{font-size:10px;font-weight:500;color:#8e8e93;margin-bottom:2px;}
.vr-msg-me .vr-msg-from{color:rgba(255,255,255,0.7);}
.vr-msg-txt{font-size:12px;color:#1d1d1f;line-height:1.45;word-break:break-word;}
.vr-msg-me .vr-msg-txt{color:#fff;}
.vr-msg-emoji{font-size:24px;line-height:1;}
.vr-msg-sys{justify-content:center!important;padding:2px 0;}
.vr-msg-sys .vr-msg-bub{background:#f0f7ff;border-radius:8px;max-width:85%;text-align:center;padding:5px 12px;font-size:10px;color:#007aff;font-weight:500;}
.vr-msg-ts{font-size:9px;color:#c7c7cc;align-self:flex-end;margin-top:3px;}
.vr-msg-me .vr-msg-ts{color:rgba(255,255,255,0.5);}
.vr-chat-inp{display:flex;gap:6px;padding:8px 14px;border-top:1px solid #f2f2f7;background:#fff;}
.vr-chat-inp input{flex:1;padding:8px 12px;background:#f2f2f7;border:1px solid transparent;border-radius:16px;color:#1d1d1f;font-size:12px;outline:none;}
.vr-chat-inp input:focus{border-color:#007aff;background:#fff;}
.vr-chat-inp input::placeholder{color:#c7c7cc;}
.vr-chat-inp button{width:32px;height:32px;border:none;background:#007aff;border-radius:50%;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.vr-chat-inp button:hover{background:#0051d5;}

/* ========== TRANSCRIPT / YUANBAO MINUTES ========== */
.vr-tran-toggle{padding:4px 8px;border:1px solid #e5e5e7;background:#fff;border-radius:5px;cursor:pointer;font-size:10px;display:flex;align-items:center;gap:3px;color:#6e6e73;}
.vr-tran-on{background:#f0f7ff;border-color:#007aff;color:#007aff;}
.vr-tran-body{flex:1;overflow-y:auto;display:flex;flex-direction:column;}
.vr-ai-box{padding:10px 14px;border-bottom:1px solid #f2f2f7;background:#fafafa;}
.vr-ai-head{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:#1d1d1f;margin-bottom:8px;}
.vr-ai-item{margin-bottom:5px;}
.vr-ai-togg{display:flex;align-items:center;justify-content:space-between;padding:7px 9px;background:#fff;border-radius:6px;font-size:11px;font-weight:500;color:#1d1d1f;cursor:pointer;border:1px solid #e5e5e7;}
.vr-ai-togg:hover{background:#f9f9fb;}
.vr-ai-text{padding:7px 9px;font-size:11px;color:#6e6e73;line-height:1.55;background:#fff;border:1px solid #f2f2f7;border-top:none;border-radius:0 0 6px 6px;}
.vr-ai-sep{height:1px;background:#e5e5e7;margin:8px 0;}
.vr-ai-feat{display:flex;align-items:center;gap:5px;font-size:11px;color:#1d1d1f;padding:2px 0;}
.vr-tran-live{flex:1;overflow-y:auto;padding:10px 14px;}
.vr-tran-ind{display:flex;align-items:center;gap:5px;font-size:10px;color:#34c759;padding:2px 0 8px;font-weight:500;}
.vr-pulse{width:5px;height:5px;background:#34c759;border-radius:50%;animation:vr-pulse 1.5s infinite;}
@keyframes vr-pulse{0%,100%{opacity:1}50%{opacity:0.25}}
.vr-tran-line{padding:7px 0;border-bottom:1px solid #f2f2f7;}
.vr-tran-hd{display:flex;align-items:center;gap:6px;margin-bottom:2px;}
.vr-tran-spk{font-size:10px;font-weight:600;color:#007aff;}
.vr-tran-tm{font-size:9px;color:#c7c7cc;}
.vr-tran-txt{font-size:11px;color:#3a3a3c;margin:3px 0 0;line-height:1.55;}
.vr-ai-bot{display:flex;align-items:center;gap:8px;padding:10px 14px;border-top:1px solid #f2f2f7;background:#fafafa;}
.vr-ai-bot-av{width:28px;height:28px;background:#007aff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;}
.vr-ai-bot-info{flex:1;display:flex;flex-direction:column;}
.vr-ai-bot-info span{font-size:11px;font-weight:500;color:#1d1d1f;}
.vr-ai-bot-info small{font-size:9px;color:#8e8e93;}
.vr-ai-bot-btn{padding:4px 10px;border:1px solid #007aff;background:#fff;color:#007aff;border-radius:5px;cursor:pointer;font-size:10px;font-weight:500;}
.vr-ai-bot-btn:hover{background:#007aff;color:#fff;}

/* ========== INVITE PANEL ========== */
.vr-inv-body{flex:1;overflow-y:auto;padding:14px;}
.vr-inv-sect{margin-bottom:14px;}
.vr-inv-lbl{font-size:10px;font-weight:600;color:#8e8e93;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 6px;display:flex;align-items:center;gap:3px;}
.vr-inv-row{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f9f9fb;border-radius:8px;border:1px solid #e5e5e7;}
.vr-inv-id{font-size:16px;font-weight:700;letter-spacing:1px;color:#1d1d1f;font-family:'SF Mono','Cascadia Code',monospace;}
.vr-inv-cpy{display:inline-flex;align-items:center;gap:3px;padding:5px 10px;border:1px solid #e5e5e7;background:#fff;color:#007aff;border-radius:6px;cursor:pointer;font-size:10px;font-weight:500;font-family:inherit;white-space:nowrap;}
.vr-inv-cpy:hover{background:#f0f7ff;border-color:#007aff;}
.vr-inv-cpy-big{flex:1;justify-content:center;padding:7px 10px;font-size:11px;}
.vr-inv-hl{padding:14px;background:linear-gradient(135deg,#f0f7ff,#fafbff);border-radius:12px;border:1.5px dashed #007aff;}
.vr-inv-hl .vr-inv-lbl{color:#007aff;}
.vr-inv-desc{font-size:11px;color:#6e6e73;margin:0 0 10px;line-height:1.5;}
.vr-inv-big{font-size:32px;font-weight:800;letter-spacing:5px;color:#007aff;text-align:center;padding:8px 0 4px;font-family:'SF Mono','Cascadia Code',monospace;background:#fff;border-radius:8px;margin-bottom:10px;border:1px solid #e5e5e7;user-select:all;}
.vr-inv-btns{display:flex;gap:6px;margin-bottom:8px;}
.vr-inv-ref{width:100%;padding:6px;border:1px solid #e5e5e7;background:#fff;color:#6e6e73;border-radius:6px;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;gap:5px;font-family:inherit;}
.vr-inv-ref:hover{background:#f2f2f7;}
.vr-inv-steps{margin-top:6px;}
.vr-inv-step{display:flex;gap:8px;padding:6px 0;font-size:11px;color:#6e6e73;line-height:1.5;}
.vr-inv-num{width:20px;height:20px;background:#f2f2f7;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#007aff;flex-shrink:0;}
.vr-inv-test{margin-top:14px;padding:12px;background:#f9f9fb;border-radius:10px;border:1px solid #e5e5e7;}
.vr-inv-test-row{display:flex;gap:6px;}
.vr-inv-test-inp{flex:1;padding:8px 10px;border:1px solid #e5e5e7;border-radius:7px;font-size:12px;color:#1d1d1f;background:#fff;outline:none;font-family:inherit;}
.vr-inv-test-inp:focus{border-color:#007aff;}
.vr-inv-test-btn{padding:7px 14px;border:none;background:#007aff;color:#fff;border-radius:7px;cursor:pointer;font-size:11px;font-weight:500;display:flex;align-items:center;gap:5px;font-family:inherit;white-space:nowrap;}
.vr-inv-test-btn:hover{background:#0051d5;}
.vr-inv-test-btn:disabled{opacity:0.4;cursor:not-allowed;}

.vr-inv-ct-list{max-height:230px;overflow-y:auto;margin-bottom:4px;}
.vr-inv-ct-row{display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;border-radius:8px;transition:all 0.12s;}
.vr-inv-ct-row:hover{background:#f0f7ff;}
.vr-inv-ct-av{font-size:24px;width:30px;text-align:center;flex-shrink:0;}
.vr-inv-ct-info{flex:1;min-width:0;display:flex;flex-direction:column;}
.vr-inv-ct-name{font-size:12px;font-weight:500;color:#1d1d1f;}
.vr-inv-ct-sub{font-size:10px;color:#8e8e93;}
.vr-inv-ct-call{display:flex;align-items:center;gap:4px;padding:5px 10px;border:1px solid #007aff;background:#fff;color:#007aff;border-radius:6px;cursor:pointer;font-size:10px;font-weight:500;font-family:inherit;white-space:nowrap;flex-shrink:0;}
.vr-inv-ct-call:hover{background:#007aff;color:#fff;}
.vr-inv-seeall{width:100%;padding:5px;border:none;background:transparent;color:#007aff;font-size:10px;cursor:pointer;text-align:center;font-family:inherit;}
.vr-inv-seeall:hover{text-decoration:underline;}
.vr-inv-sep-or{display:flex;align-items:center;gap:10px;margin:12px 0;color:#c7c7cc;font-size:10px;font-weight:500;}
.vr-inv-sep-or::before,.vr-inv-sep-or::after{content:'';flex:1;height:1px;background:#e5e5e7;}

/* ========== MORE PANEL ========== */
.vr-more-body{flex:1;padding:6px;}
.vr-more-item{display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border:none;background:transparent;color:#1d1d1f;border-radius:8px;cursor:pointer;text-align:left;font-size:12px;font-family:inherit;}
.vr-more-item:hover{background:#f9f9fb;}
.vr-more-on{background:#f0f7ff!important;}
.vr-more-ico{width:32px;height:32px;background:#f2f2f7;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#6e6e73;}
.vr-more-txt{display:flex;flex-direction:column;line-height:1.4;}
.vr-more-txt strong{font-size:12px;color:#1d1d1f;}
.vr-more-txt small{font-size:10px;color:#8e8e93;}

/* ========== BOTTOM TOOLBAR (Tencent Meeting Style) ========== */
.vr-bar-wrap{display:flex;justify-content:center;padding:8px 0 12px;flex-shrink:0;z-index:20;background:#fff;border-top:1px solid #e5e5e7;}
.vr-bar{display:flex;align-items:center;gap:2px;padding:2px 12px;background:#fff;border-radius:14px;}
.vr-bar-seg{display:flex;align-items:center;gap:2px;}
.vr-bar-div{width:1px;height:24px;background:#e5e5e7;margin:0 6px;}

.vr-bar-btn{position:relative;min-width:50px;height:52px;border:none;background:transparent;color:#6e6e73;border-radius:10px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;transition:all 0.15s;padding:2px;}
.vr-bar-btn:hover{background:#f2f2f7;color:#1d1d1f;}
.vr-bar-txt{font-size:8px;color:#8e8e93;line-height:1;font-weight:500;margin-top:1px;}
.vr-bar-btn:hover .vr-bar-txt{color:#1d1d1f;}

.vr-bar-btn-sm{width:38px;height:38px;border:none;background:transparent;color:#6e6e73;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
.vr-bar-btn-sm:hover{background:#f2f2f7;color:#1d1d1f;}

.vr-bar-off{color:#ff3b30!important;}
.vr-bar-off:hover{background:#fff2f2!important;color:#e0352b!important;}
.vr-bar-off .vr-bar-txt{color:#ff3b30!important;}

.vr-bar-act{color:#007aff!important;background:#f0f7ff!important;}
.vr-bar-act .vr-bar-txt{color:#007aff!important;}

.vr-bar-badge{position:absolute;top:2px;right:4px;min-width:14px;height:14px;padding:0 3px;background:#ff3b30;border-radius:7px;font-size:8px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;line-height:1;}

/* Emoji picker */
.vr-bar-emoji-wrap{position:relative;}
.vr-emoji-pop{position:absolute;bottom:48px;left:50%;transform:translateX(-50%);display:flex;gap:3px;padding:6px;background:#fff;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.12);border:1px solid #e5e5e7;z-index:30;}
.vr-emoji-itm{width:32px;height:32px;border:none;background:transparent;border-radius:6px;cursor:pointer;font-size:17px;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
.vr-emoji-itm:hover{background:#f2f2f7;transform:scale(1.1);}

/* End button */
.vr-bar-end{min-width:48px;height:36px;border:none;background:#ff3b30;color:#fff;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;font-size:12px;font-weight:600;margin-left:8px;padding:0 14px;font-family:inherit;}
.vr-bar-end:hover{background:#d70015;transform:scale(1.02);}

/* ========== OVERLAYS (Guest Join / Ringing) ========== */
.vr-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:300;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);}
.vr-guest-card{text-align:center;animation:vr-pop 0.25s ease;background:#fff;padding:32px 40px;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,0.2);max-width:360px;width:90%;}
.vr-guest-ico{font-size:44px;display:block;margin-bottom:10px;}
.vr-guest-card h2{color:#1d1d1f;margin:0 0 4px;font-size:18px;font-weight:600;}
.vr-guest-sub{font-size:12px;color:#8e8e93;margin:0 0 10px;}
.vr-guest-sub strong{color:#007aff;letter-spacing:2px;}
.vr-guest-desc{font-size:12px;color:#6e6e73;margin:0 0 14px;}
.vr-guest-inp{width:100%;padding:10px 14px;border:2px solid #e5e5e7;border-radius:10px;font-size:15px;color:#1d1d1f;outline:none;text-align:center;box-sizing:border-box;font-family:inherit;}
.vr-guest-inp:focus{border-color:#007aff;}
.vr-guest-inp::placeholder{color:#c7c7cc;}
.vr-guest-acts{display:flex;gap:8px;margin-top:14px;}
.vr-guest-join{flex:1;padding:10px 0;border:none;background:#007aff;color:#fff;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;font-family:inherit;}
.vr-guest-join:hover{background:#0051d5;}
.vr-guest-join:disabled{opacity:0.4;cursor:not-allowed;}
.vr-guest-cancel{flex:1;padding:10px 0;border:1px solid #e5e5e7;background:#fff;color:#6e6e73;border-radius:10px;cursor:pointer;font-size:14px;font-weight:500;font-family:inherit;}
.vr-guest-cancel:hover{background:#f2f2f7;}

/* Ringing */
.vr-ring-card{text-align:center;animation:vr-pop 0.25s ease;background:#fff;padding:36px 44px;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,0.2);}
@keyframes vr-pop{from{transform:scale(0.85);opacity:0}to{transform:scale(1);opacity:1}}
.vr-ring-av{font-size:72px;display:block;margin-bottom:12px;}
.vr-ring-card h2{color:#1d1d1f;margin:0 0 6px;font-size:20px;font-weight:600;}
.vr-ring-card p{color:#8e8e93;margin:0 0 16px;font-size:13px;}
.vr-ring-dots{display:flex;justify-content:center;gap:6px;margin-bottom:20px;}
.vr-ring-dots span{width:7px;height:7px;background:#007aff;border-radius:50%;animation:vr-bounce 1.4s infinite;}
.vr-ring-dots span:nth-child(2){animation-delay:0.2s;}
.vr-ring-dots span:nth-child(3){animation-delay:0.4s;}
@keyframes vr-bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
.vr-ring-cancel{width:48px;height:48px;border:none;background:#ff3b30;color:#fff;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;margin:0 auto;}
.vr-ring-cancel:hover{background:#d70015;transform:scale(1.06);}

/* ========== WHITEBOARD ========== */
.vr-wb-overlay{position:fixed;inset:0;z-index:250;display:flex;flex-direction:column;background:rgba(0,0,0,0.7);backdrop-filter:blur(2px);}
.vr-wb-toolbar{display:flex;align-items:center;gap:4px;padding:6px 12px;background:#fff;border-bottom:1px solid #e5e5e7;flex-shrink:0;z-index:2;overflow-x:auto;}
.vr-wb-tool{width:34px;height:34px;border:none;background:transparent;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#6e6e73;transition:all 0.15s;font-size:14px;}
.vr-wb-tool:hover{background:#f2f2f7;color:#1d1d1f;}
.vr-wb-active{background:#f0f7ff!important;color:#007aff!important;}
.vr-wb-sep{width:1px;height:20px;background:#e5e5e7;margin:0 4px;flex-shrink:0;}
.vr-wb-color{width:22px;height:22px;border-radius:50%;border:1px solid rgba(0,0,0,0.12);cursor:pointer;flex-shrink:0;transition:transform 0.15s;}
.vr-wb-color:hover{transform:scale(1.15);}
.vr-wb-sz{width:28px;height:28px;border:none;background:transparent;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
.vr-wb-sz:hover{background:#f2f2f7;}
.vr-wb-sz-act{background:#f0f7ff!important;}
.vr-wb-close{margin-left:auto;}
.vr-wb-close:hover{background:#ff3b30!important;color:#fff!important;}
.vr-wb-canvas-wrap{flex:1;display:flex;align-items:center;justify-content:center;padding:20px;}
.vr-wb-canvas{border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.15);cursor:crosshair;max-width:100%;max-height:100%;}

/* ========== RESPONSIVE ========== */
@media(max-width:768px){
  .vr-panel{position:fixed;inset:0;width:100%;z-index:50;}
  .vr-bar{gap:0;padding:2px 4px;}
  .vr-bar-btn{min-width:42px;height:46px;}
  .vr-bar-txt{display:none;}
  .vr-bar-div{margin:0 2px;}
  .vr-bar-end{min-width:40px;height:32px;padding:0 10px;font-size:11px;margin-left:3px;}
  .vr-grid{gap:4px;padding:4px;}
  .vr-speaker-strip{gap:4px;}
  .vr-tile-thumb{width:110px;height:70px;}
  .vr-tile{aspect-ratio:16/10;}
  .vr-top-title{max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;}
  .vr-hd-badge{display:none;}
  .vr-spotlight-wrap{flex-direction:column;}
  .vr-spotlight-main{flex:0 0 50%;margin:0 0 4px 0;}
  .vr-spotlight-strip{flex-direction:row;width:100%;overflow-x:auto;overflow-y:hidden;gap:4px;max-height:110px;}
  .vr-tile-side{width:140px;flex-shrink:0;}
}
      `}</style>
    </div>
  );
}
