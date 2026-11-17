/*
 * Every word the game shows, in one place, so it can be edited without touching the code.
 * (The title card and the two end cards are in index.html.)
 *
 * How long a text stays: 2 s plus 0.35 s for each word; a click dismisses it sooner.
 * The drafts for the Nice One, anger, fear of abandonment and fear of confrontation are the
 * owner's (PLAN.md 10.4); the rest were written in the same voice and are proposals.
 */

/** White masks: the social faces. `title` is shown above the lines. */
export const WHITE = [
  { id: 'nice', title: 'The Nice One', lines: ['You agree before you have thought.', 'Everyone likes this face.', 'No one has met you.'] },
  { id: 'strong', title: 'The Strong One', lines: ['You carry it and say it is nothing.', 'People lean on this face.', 'No one has asked it how it is.'] },
  { id: 'clever', title: 'The Clever One', lines: ['You have the answer before the question ends.', 'It keeps you one step away from everyone.'] },
  { id: 'helper', title: 'The Helper', lines: ['You know what everyone needs.', 'You give it before they ask.', 'No one knows what you need.'] },
  { id: 'goodchild', title: 'The Good Child', lines: ['You did what was asked, and did it well.', 'You are still waiting to be told it was enough.'] },
  { id: 'joker', title: 'The Joker', lines: ['You make the room laugh.', 'The laugh arrives a moment before anything can touch you.'] },
  { id: 'needsnothing', title: 'The One Who Needs Nothing', lines: ['You ask for nothing, so nothing is refused.', 'The door is kept shut from your side.'] },
  { id: 'fine', title: 'The One Who Is Fine', lines: ['How are you. Fine.', 'It is the shortest way out of the conversation.'] },
];

/**
 * Black masks: the shadows. The lines begin as an irritation with other people and end as the
 * question. `kind` chooses how the shadow behaves once the mask is taken (main.js): 'anger',
 * 'abandonment' and 'confrontation' are built; the others stand at the far end and grow until
 * you walk through them (their own behaviours are stage D of the plan).
 *   hint      the line at the bottom of the screen while this shadow is loose
 *   inside    the one line shown in the dark as you go through it
 *   strength  what it gives back, in one word; `gives` says it in full under the word
 */
export const BLACK = [
  {
    id: 'anger', kind: 'anger',
    lines: ['People who shout disgust you.', 'You never raise your voice.', 'You are tired all the time.'],
    hint: 'It is coming. Stand. Do not step back.',
    inside: 'It was never rage. It was a no you were not allowed to say.',
    strength: 'Force', gives: 'The force to say no.',
  },
  {
    id: 'abandonment', kind: 'abandonment',
    lines: ['You leave first, so that no one can leave you.'],
    hint: 'It keeps behind you. Stop, turn round, and wait for it.',
    inside: 'It was not leaving. It was waiting to see if you would stay.',
    strength: 'Staying', gives: 'The capacity to stay.',
  },
  {
    id: 'confrontation', kind: 'confrontation',
    lines: ['You said yes.', 'You are still angry about it.'],
    hint: 'It backs away. Walk to it steadily. Do not hurry.',
    inside: 'It kept quiet for you. It still knows every word.',
    strength: 'Voice', gives: 'Your own voice.',
  },
  {
    id: 'judgement', kind: 'still',
    lines: ['You see at once what is wrong with people.', 'You keep a list.', 'Your own name is at the top of it.'],
    hint: 'It stands in the corridor and grows. Face it, walk to it, and through.',
    inside: 'The hardest sentence was the one you passed on yourself.',
    strength: 'Discernment', gives: 'Seeing clearly, without the sentence.',
  },
  {
    id: 'envy', kind: 'still',
    lines: ['People who show what they have bore you.', 'You know exactly what they have.'],
    hint: 'It stands in the corridor and grows. Face it, walk to it, and through.',
    inside: 'All along it was pointing at what you want.',
    strength: 'Desire', gives: 'Knowing what you want.',
  },
  {
    id: 'shame', kind: 'still',
    lines: ['People who make a scene make you look away.', 'No one has ever seen you fall.'],
    hint: 'It stands in the corridor and grows. Face it, walk to it, and through.',
    inside: 'It only ever hid what wanted to be seen.',
    strength: 'Seen', gives: 'Being seen.',
  },
  {
    id: 'need', kind: 'still',
    lines: ['Needy people wear you out.', 'You have not asked for anything in years.'],
    hint: 'It stands in the corridor and grows. Face it, walk to it, and through.',
    inside: 'The hand it held out was your own.',
    strength: 'Receiving', gives: 'Being able to receive.',
  },
  {
    id: 'control', kind: 'still',
    lines: ['Careless people make you furious.', 'If you let go of one thing, everything goes.'],
    hint: 'It stands in the corridor and grows. Face it, walk to it, and through.',
    inside: 'It held everything, so that you would not feel it fall.',
    strength: 'Trust', gives: 'Trust.',
  },
];

/** The question every black mask ends with, and the two answers. */
export const QUESTION = 'Is this one yours?';
export const CHOICE = {
  take: 'Take it',
  leave: 'Leave it',
  // what to press, shown small under each answer
  takeKey: { desk: 'E · click', touch: 'tap' },
  leaveKey: { desk: 'Q · or walk away', touch: 'tap' },
};

/** The one line low on the screen. */
export const LINES = {
  start: 'Walk down the corridor.',
  wall: { desk: 'Go close to a mask and look at it. Click, or press E, to pick it.', touch: 'Go close to a mask and look at it. Tap to pick it.' },
  afterWhite: 'The black ones hang where the wall is dark. Find one that is yours.',
  busy: 'Face what you took first.',
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
    touch: ['The left thumb walks. The right thumb looks. Tap to pick.', 'The flask in the corner is your light. Hurrying dims it.'],
  },
  // the first time you come to the wall
  wall: 'The white masks are the faces you show. The black ones are what you keep out of sight. Take three black ones, and face what comes of each.',
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
