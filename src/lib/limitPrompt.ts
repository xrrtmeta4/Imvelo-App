import { toast } from 'sonner';

type LimitKind = 'scan' | 'chat';

const COPY: Record<LimitKind, { title: string; description: string }> = {
  scan: {
    title: "You've used your 2 free scans this week 🌱",
    description:
      'Your free scans reset on Monday. Go Premium for unlimited pest, animal, soil and yield scans — plus AI advisory, climate and irrigation tools.',
  },
  chat: {
    title: "That's your 3 free Chloe chats for today 👋",
    description:
      'Chloe is back with 3 more chats tomorrow. Go Premium for unlimited conversations, anytime.',
  },
};

/** Friendly, non-intrusive limit notice with a one-tap upgrade path. */
export const showLimitReached = (kind: LimitKind) => {
  const { title, description } = COPY[kind];
  toast(title, {
    description,
    duration: 9000,
    action: {
      label: 'Upgrade',
      onClick: () => {
        window.location.assign('/upgrade');
      },
    },
  });
};
