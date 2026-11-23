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
 *   kind      how the shadow behaves once the mask is taken (main.js, PLAN.md 10.4). Eight ways:
 *               'anger'          comes at you fast and stands over you: stand, do not step back
 *               'abandonment'    small, keeps behind you: stop, turn round, wait for it
 *               'confrontation'  gives way as you come: walk at it steadily, never hurrying
 *               'judgement'      tall, points at you; its look pushes you back: keep walking into it
 *               'envy'           stands by whatever shines, and moves on as you come: stop near it, hold your light on it
 *               'shame'          hides in the darkest place, face covered: find it, hold your light on it
 *               'need'           reaches for you, then pulls its hands away: hold out your light and wait
 *               'control'        walks at you stiffly; doors slam as it passes: stand still, let it shut every one, then walk
 *               'still'          (spare) stands and grows: face it, walk to it
 *             Each mask is given the way that suits what it is (grief waits behind you until you
 *             stop; truth backs away; cruelty comes at you; the victim points).
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
    id: 'judgement', kind: 'judgement',
    lines: ['You see at once what is wrong with people.', 'You keep a list.', 'Your own name is at the top of it.'],
    inside: 'The hardest sentence was the one you passed on yourself.',
    strength: 'Discernment', gives: 'Seeing clearly, without the sentence.',
  },
  {
    id: 'envy', kind: 'envy',
    lines: ['People who show what they have bore you.', 'You know exactly what they have.'],
    inside: 'All along it was pointing at what you want.',
    strength: 'Desire', gives: 'Knowing what you want.',
  },
  {
    id: 'shame', kind: 'shame',
    lines: ['People who make a scene make you look away.', 'No one has ever seen you fall.'],
    inside: 'It only ever hid what wanted to be seen.',
    strength: 'Seen', gives: 'Being seen.',
  },
  {
    id: 'need', kind: 'need',
    lines: ['Needy people wear you out.', 'You have not asked for anything in years.'],
    inside: 'The hand it held out was your own.',
    strength: 'Receiving', gives: 'Being able to receive.',
  },
  {
    id: 'control', kind: 'control',
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
    id: 'worth', kind: 'envy',
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
    id: 'selfishness', kind: 'need',
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
    id: 'victim', kind: 'judgement',
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
  judgement: 'Its look pushes you back. Keep walking into it.',
  envy: 'It stands by whatever shines. Stop near it, and hold your light on it.',
  shame: 'It hides where it is darkest. Find it, and hold your light on it.',
  need: 'It reaches for you, and pulls away. Hold out your light, and wait.',
  control: 'Doors shut as it passes. Stand still and let it shut every one. Then walk to it.',
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
  // a person has one shadow with countless faces (Jung, CW 9i): the count is the door's, not yours
  another: (left) => (left === 2 ? 'The door waits for two more.' : left === 1 ? 'The door waits for one more.' : ''),
  // after the third, as the door opens
  more: 'There are more. There always are.',
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
  wall: 'White masks are the faces you show. Black masks, in the dark on both walls, are what you keep out of sight. Every black mask is a face of the one you do not show. Read as many as you like. Take one that is yours, and face what comes of it.',
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
  // the five later ways
  pushed: 'It is pushing you back. Keep walking into it.',
  slipped: 'It went to the next light. This time, stop near it and hold yours on it.',
  hidden: 'No candle reaches where it hides. Look in the corners.',
  holdLight: 'Hold your light on it. Do not move.',
  grabbed: 'You reached for it, and it pulled away. Let it come to you.',
  frozen: 'It stopped when you moved. Stand still, and let it shut the doors.',
  doorsShut: 'Every door is shut. Now walk to it.',
};

/**
 * Level II, albedo: the three sealed letters on the water (PLAN.md 10.5). Each is one way of
 * working with a dream (the infographic's second technique). Proposals, in the same voice.
 */
export const LETTERS = [
  {
    id: 'room', title: 'The Secret Room',
    lines: ['You dream of your own house, and find a door you never saw.', 'Behind it, a room that was always there.', 'Whatever you find in it is a part of you not yet lived in.'],
  },
  {
    id: 'feeling', title: 'The Feeling of the Dream',
    lines: ['Something chases you through the night.', 'Do not ask what it was. Ask what you felt as you ran:', 'fear, or shame, or a strange relief.', 'The feeling is the letter. The story is only the envelope.'],
  },
  {
    id: 'other', title: 'The Other Role',
    lines: ['Dream it again, as the one who chases.', 'Now you can see what it carried in its hands.', 'It was never trying to catch you. It was trying to give you something.'],
  },
];
export const ALBEDO = {
  title: 'II · Albedo',
  enter: 'Below the house the water is black and still.',
  // the horse (PLAN.md 10.5, step 2): instinct met, not mastered
  horseLine: 'Stand still. Lower your eyes, and your light.',
  horsePushed: 'It will not be driven, and it will not let you past.',
  horseHint: 'It is afraid of your light. Stop, and lower your eyes.',
  horseCame: 'It came to you.',
  horseFollow: 'Follow it.',
  // the letters and the sunken doors
  letters: 'Three letters float sealed, brighter than the rest. Find them.',
  letterLine: (left) => (left === 3 ? 'Find the first sealed letter.' : left === 2 ? 'Find the next letter.' : 'Find the last letter.'),
  door: 'A door under the water has opened. Go through it.',
  rooms: {
    room: {
      line: 'A room you never saw. Look round it.',
      pick: 'On the table, a box. Open it.',
      title: 'The Secret Room',
      lines: ['It was furnished, and warm, and no one had lived in it.', 'It was always part of the house.', 'It is yours now.'],
    },
    feeling: {
      line: 'Something is coming. Do not run. Choose what you feel.',
      words: { fear: 'Fear', shame: 'Shame', relief: 'Relief' },
      lines: {
        fear: ['Fear. And it stopped.', 'What chased you was the fear, running beside you.'],
        shame: ['Shame. And it turned its face away, as you would.', 'It was ashamed too.'],
        relief: ['Relief. And it stood still and lowered its head.', 'You had been waiting for it a long time.'],
      },
      title: 'The Feeling of the Dream',
    },
    other: {
      line: 'Now you are the one who follows. Something is in your hands.',
      give: 'It has stopped. Give it what you carry.',
      title: 'The Other Role',
      lines: ['It was never running from you.', 'You were bringing it something all along.'],
    },
  },
  back: 'The door closes behind you. White comes into the flask.',
  hallOpen: 'At the end of the water, a door has opened.',
  statue: { goddess: 'On the column, a goddess shines gold. Hold your light on her face.', god: 'On the column, a god shines gold. Hold your light on his face.' },
  otherFar: 'Someone far off holds up a light of their own.',
  otherRecedes: 'The nearer you come, the further they go.',
  goldBack: 'A statue, not a god. The gold is in your own flask.',
  otherWaits: 'The one with the other light has stopped. They are waiting.',
  goToOther: 'Go to them.',
  bird: 'White.',
  follow: 'Follow them down.',
  done: 'The black has turned white.',
  endCard: '<p>The gold you put on another is back in your own vessel, and the black has turned white.</p><p class="soft">Someone with a light of their own walks beside you now.</p>',
  next: 'III · Rubedo · to come',
  pauseHow: 'Below the house: let the horse come to you, read the three letters and go through the doors they open, then take back the gold from the statue.',
};

/** On the pause card: what the level asks of you, in one line. */
export const PAUSE_HOW = 'Read the masks. Take a black one that is yours, and face what it becomes: turn to it, hold your light on it, and walk into it. The door at the end opens after three.';

/** How long a text stays on screen, in seconds. */
export const readingTime = (text) => 2 + 0.35 * String(text).trim().split(/\s+/).length;

/**
 * The introduction page, shown before the title card (index.html, wired in main.js).
 * Proposals in the owner's voice: edit freely. `cards` are the three levels; a card with
 * `playable: false` is greyed out and cannot be clicked. `at` is the level a playable card
 * jumps to (null = the real start). Jumping never touches the saved progress.
 */
export const INTRO = {
  studio: 'Soul Spiral Studio',
  title: ['SHADOW', 'TO GOLD'],
  tag: 'Prototype',
  concept: [
    'What you push out of sight does not leave. It waits, and it takes your shape.',
    'The old work begins in the dark, and goes by water and by fire.',
    'What was never looked at is the lead. It can be turned to gold.',
  ],
  cards: [
    { num: 'I', name: 'Nigredo', sub: 'the blackening', text: 'The house. The faces you wear.', playable: true, at: null },
    { num: 'II', name: 'Albedo', sub: 'the whitening', text: 'The water. The Other.', playable: true, at: 'albedo' },
    { num: 'III', name: 'Rubedo', sub: 'the reddening', text: 'To come', playable: false, at: null },
  ],
  begin: 'Begin',
  test: 'Prototype: try any level',
  testHint: 'for testing · your saved progress is not touched',
};
