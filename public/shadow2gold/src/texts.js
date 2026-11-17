/*
 * Every word the game shows, in one place, so it can be edited without touching the code.
 * (The title card and the Albedo card are in index.html.)
 *
 * How long a text stays: 2 s plus 0.35 s for each word; a click dismisses it sooner.
 *
 * Whose words: the Nice One and the cores of anger, fear of abandonment and fear of
 * confrontation are the owner's drafts (PLAN.md 10.4). Everything else was written in the same
 * voice and is a proposal. On 2026-11-17 the owner asked for a wider, deeper set than his own
 * examples ("I couldn't find any shadow that suits me"): there are now 12 white masks and 20
 * black ones. Add, cut or rewrite freely; the wall hangs whatever is listed here (masks.js).
 */

/**
 * White masks: the persona, the faces shown to the world. `title` is shown above the lines.
 * A persona is not a lie (Jung: it is needed; the danger is taking it for the whole of oneself),
 * so these are said without contempt. `hides` names the black mask this face most often keeps
 * out of sight: when you have read the white one, that black one stirs on the wall.
 */
export const WHITE = [
  { id: 'nice', title: 'The Nice One', hides: 'anger', lines: ['You agree before you have thought.', 'Everyone likes this face.', 'No one has met you.'] },
  { id: 'strong', title: 'The Strong One', hides: 'softness', lines: ['You carry it and say it is nothing.', 'People lean on this face.', 'No one has asked it how it is.'] },
  { id: 'clever', title: 'The Clever One', hides: 'play', lines: ['You have the answer before the question ends.', 'It keeps you one step away from everyone.', 'It is years since you said: I do not know.'] },
  { id: 'helper', title: 'The Helper', hides: 'need', lines: ['You know what everyone needs.', 'You give it before they ask.', 'No one knows what you need.'] },
  { id: 'goodchild', title: 'The Good Child', hides: 'selfishness', lines: ['You did what was asked, and did it well.', 'You are still waiting to be told it was enough.'] },
  { id: 'joker', title: 'The Joker', hides: 'grief', lines: ['You make the room laugh.', 'The laugh arrives a moment before anything can touch you.'] },
  { id: 'needsnothing', title: 'The One Who Needs Nothing', hides: 'abandonment', lines: ['You ask for nothing, so nothing is refused.', 'The door is kept shut from your side.'] },
  { id: 'fine', title: 'The One Who Is Fine', hides: 'coldness', lines: ['How are you. Fine.', 'It is the shortest way out of the conversation.', 'You use it on yourself as well.'] },
  { id: 'perfect', title: 'The Perfect One', hides: 'shame', lines: ['Nothing leaves your hands until it is beyond reproach.', 'It is beautiful work.', 'It is a wall, built one flawless brick at a time.'] },
  { id: 'busy', title: 'The Busy One', hides: 'rest', lines: ['Your days are full to the edge.', 'People admire how much you carry.', 'If you stopped, you would hear it.'] },
  { id: 'rebel', title: 'The Rebel', hides: 'control', lines: ['You say no before the question is finished.', 'It looks like freedom.', 'It is the same leash, pulled the other way.'] },
  { id: 'above', title: 'The One Above It All', hides: 'body', lines: ['Nothing reaches you any more.', 'You call it peace.', 'It is very quiet up here.'] },
];

/**
 * Black masks: the shadow, what was put out of sight. Each begins as an irritation with other
 * people (the first technique of the infographic: what you can not stand in others) and turns.
 * The question is added by the game.
 *   kind      how the shadow behaves once the mask is taken (main.js). Four ways are built:
 *               'anger'          comes at you fast and stands over you: stand, do not step back
 *               'abandonment'    small, keeps behind you: stop, turn round, wait for it
 *               'confrontation'  gives way as you come: walk at it steadily, never hurrying
 *               'still'          stands and grows: face it, walk to it
 *             Each mask is given the way that suits what it is (grief waits behind you until you
 *             stop; truth backs away; cruelty comes at you). Stage D of the plan gives judgement,
 *             envy, shame, need and control ways of their own.
 *   inside    the one line shown in the dark as you go through it
 *   strength  what it gives back, in one word; `gives` says it in full under the word
 *   hint      optional: the bottom line while this shadow is loose (otherwise HINTS[kind])
 */
export const BLACK = [
  {
    id: 'anger', kind: 'anger',
    lines: ['People who shout disgust you.', 'You never raise your voice.', 'You are tired all the time.'],
    inside: 'It was never rage. It was a no you were not allowed to say.',
    strength: 'Force', gives: 'The force to say no.',
  },
  {
    id: 'abandonment', kind: 'abandonment',
    lines: ['People who cling make you uneasy.', 'You leave first, so that no one can leave you.'],
    inside: 'It was not leaving. It was waiting to see if you would stay.',
    strength: 'Staying', gives: 'The capacity to stay.',
  },
  {
    id: 'confrontation', kind: 'confrontation',
    lines: ['People who make trouble tire you.', 'You said yes.', 'You are still angry about it.'],
    inside: 'It kept quiet for you. It still knows every word.',
    strength: 'Voice', gives: 'Your own voice.',
  },
  {
    id: 'judgement', kind: 'still',
    lines: ['You see at once what is wrong with people.', 'You keep a list.', 'Your own name is at the top of it.'],
    inside: 'The hardest sentence was the one you passed on yourself.',
    strength: 'Discernment', gives: 'Seeing clearly, without the sentence.',
  },
  {
    id: 'envy', kind: 'still',
    lines: ['People who show what they have bore you.', 'You know exactly what they have.'],
    inside: 'All along it was pointing at what you want.',
    strength: 'Desire', gives: 'Knowing what you want.',
  },
  {
    id: 'shame', kind: 'still',
    lines: ['People who make a scene make you look away.', 'No one has ever seen you fall.'],
    inside: 'It only ever hid what wanted to be seen.',
    strength: 'Seen', gives: 'Being seen.',
  },
  {
    id: 'need', kind: 'still',
    lines: ['Needy people wear you out.', 'You have not asked for anything in years.'],
    inside: 'The hand it held out was your own.',
    strength: 'Receiving', gives: 'Being able to receive.',
  },
  {
    id: 'control', kind: 'still',
    lines: ['Careless people make you furious.', 'If you let go of one thing, everything goes.'],
    inside: 'It held everything, so that you would not feel it fall.',
    strength: 'Trust', gives: 'Trust.',
  },
  {
    id: 'body', kind: 'anger',
    lines: ['People who live in their bodies embarrass you:', 'the loud laugh, the second helping, the sweat.', 'You have lived from the neck up for years.'],
    inside: 'It was never beneath you. It was carrying you the whole time.',
    strength: 'Instinct', gives: 'Being at home in your body.',
  },
  {
    id: 'rest', kind: 'abandonment',
    lines: ['Lazy people make you angry.', 'You have not sat down without a reason since you were a child.'],
    inside: 'It was not idleness. It was the part of you that knew when to stop.',
    strength: 'Rest', gives: 'Rest, without earning it.',
  },
  {
    id: 'worth', kind: 'still',
    lines: ['People who think they are special irritate you.', 'Quietly, you have always believed that you are.', 'You have never dared to find out.'],
    inside: 'It was not vanity. It was what you are for, kept in the dark.',
    strength: 'Worth', gives: 'Taking your own measure.',
  },
  {
    id: 'softness', kind: 'abandonment',
    lines: ['Weak people embarrass you.', 'You have never once let yourself be carried.'],
    inside: 'It was not weakness. It was the only part of you that could be touched.',
    strength: 'Tenderness', gives: 'Letting yourself be touched.',
  },
  {
    id: 'cruelty', kind: 'anger',
    lines: ['Cruel people horrify you.', 'You know exactly which sentence would break each person you love.', 'You have known for years.'],
    inside: 'It was always there. Seen, it can no longer act without you.',
    strength: 'Choice', gives: 'Knowing what you could do, and choosing.',
  },
  {
    id: 'truth', kind: 'confrontation',
    lines: ['Liars disgust you.', 'You tell each person what they want to hear,', 'and you call it kindness.'],
    inside: 'It learned to lie so that you would be loved. It remembers what is true.',
    strength: 'Truth', gives: 'Saying what is so.',
  },
  {
    id: 'selfishness', kind: 'still',
    lines: ['Selfish people enrage you.', 'You can not remember the last thing you did only because you wanted to.'],
    inside: 'It was keeping your share for you, all this time.',
    strength: 'Mine', gives: 'Taking your own share.',
  },
  {
    id: 'grief', kind: 'abandonment',
    lines: ['People who cry easily make you impatient.', 'There is a funeral you never went to.'],
    inside: 'It was not sadness you were spared. It was the love the sadness belongs to.',
    strength: 'Tears', gives: 'Being able to mourn.',
  },
  {
    id: 'courage', kind: 'anger',
    lines: ['Fearful people irritate you.', 'You have arranged your whole life so that nothing in it can frighten you.'],
    inside: 'It was not the danger it feared. It was how much you wanted to go.',
    strength: 'Courage', gives: 'Going, afraid.',
  },
  {
    id: 'victim', kind: 'still',
    lines: ['People who are always the victim exhaust you.', 'You keep an exact account of what was done to you.', 'You read it every night.'],
    inside: 'It held the wound open so that someone would see it. You have seen it.',
    strength: 'Authorship', gives: 'Your life as your own doing.',
  },
  {
    id: 'play', kind: 'abandonment',
    lines: ['Childish people annoy you.', 'You stopped playing on a day you could still name.'],
    inside: 'It did not grow up because it was told to wait. It has been waiting.',
    strength: 'Play', gives: 'Play, for nothing.',
  },
  {
    id: 'coldness', kind: 'confrontation',
    lines: ['Cold people frighten you.', 'Something in you went quiet a long time ago,', 'and you called it calm.'],
    inside: 'It was not empty. It went numb so that you could get through.',
    strength: 'Feeling', gives: 'Feeling it.',
  },
];

/** The bottom line while a shadow is loose, by the way it behaves. */
export const HINTS = {
  anger: 'It is coming. Stand. Do not step back.',
  abandonment: 'It keeps behind you. Stop, turn round, and wait for it.',
  confrontation: 'It backs away. Walk to it steadily. Do not hurry.',
  still: 'It stands in the corridor and grows. Face it, walk to it, and through.',
};

/** The question every black mask ends with, and the two answers. */
export const QUESTION = 'Is this one yours?';
export const CHOICE = {
  take: 'Take it',
  leave: 'Leave it',
  // what to press, shown small under each answer
  takeKey: { desk: 'E · click', touch: 'tap' },
  leaveKey: { desk: 'Q · right click', touch: 'tap' },
};

/** The one line low on the screen. */
export const LINES = {
  start: 'Walk down the corridor.',
  wall: { desk: 'Look at a mask. Click, or press E, to pick it.', touch: 'Look at a mask. Tap to pick it.' },
  afterWhite: 'The black ones hang in the dark, on both walls. Find one that is yours.',
  another: (left) => (left === 2 ? 'Find another. Two remain.' : left === 1 ? 'Find another. One remains.' : ''),
  door: 'The door that was never there is open. Go down.',
  doorAgain: 'The door is open. The masks you left are still on the wall.',
};

/**
 * Tips: a sentence above the bottom line, shown when it is useful and then gone. They say how the
 * level is played; the line under them says what to do now. Each is shown a limited number of times.
 */
export const TIPS = {
  // one after the other, when you wake
  wake: {
    desk: ['Walk with W A S D. Look with the mouse or two fingers on the trackpad. Space turns you round.', 'The flask in the corner is your light. Hurrying dims it.'],
    touch: ['Drag the circle to walk; to its edge to hurry. Drag on the right to look: hold your finger at the side of the screen to keep turning.', 'Tap Pick when a mask is in reach.'],
  },
  // the first time you come to the wall
  wall: 'White masks are the faces you show. Black masks, in the dark on both walls, are what you keep out of sight. Read as many as you like. Take three black ones that are yours, and face what comes of each.',
  // after the first white mask
  persona: 'A mask is not a lie. The danger is forgetting that it is a mask.',
  // when a white mask you read makes a black one move
  stirred: 'Each face you wear keeps another out of sight. One of the black masks stirred.',
  // the first time a shadow stands up
  taken: 'What you took is loose in the house now, in your shape. It can not hurt you. It grows until you go through it.',
  light: 'Turn to it. While you face it with your light, it does not grow.',
  // while one is loose
  growing: 'It is growing behind your back. Turn to it.',
  hurry: 'Hurrying feeds it. Walk.',
  through: 'Go on. Walk into it, and through.',
  steppedBack: 'You stepped back, and it grew. Stand where you are.',
  waitForIt: 'Stand still and keep looking at it. Let it come.',
};

/** How long a text stays on screen, in seconds. */
export const readingTime = (text) => 2 + 0.35 * String(text).trim().split(/\s+/).length;
