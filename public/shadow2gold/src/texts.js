/*
 * Every word the game shows, in one place, so it can be edited without touching the code.
 * (The title card and the Albedo card are in index.html.)
 *
 * How long a text stays: 3 s plus 0.45 s for each word; a click dismisses it sooner.
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
 *   now       what is different in your life once it is yours again (shown after the strength)
 *   hint      optional: the bottom line while this shadow is loose (otherwise HINTS[kind])
 */
export const BLACK = [
  {
    id: 'anger', kind: 'anger',
    lines: ['People who shout disgust you.', 'You never raise your voice.', 'You are tired all the time.'],
    inside: 'It was never rage. It was a no you were not allowed to say.',
    strength: 'Force', gives: 'The force to say no.',
    now: 'You say no early and calmly, so it no longer bursts out late, at the wrong person.',
  },
  {
    id: 'abandonment', kind: 'abandonment',
    lines: ['People who cling make you uneasy.', 'You leave first, so that no one can leave you.'],
    inside: 'It was not leaving. It was waiting to see if you would stay.',
    strength: 'Staying', gives: 'The capacity to stay.',
    now: 'You can be close without holding on, and let people go without leaving first.',
  },
  {
    id: 'confrontation', kind: 'confrontation',
    lines: ['People who make trouble tire you.', 'You said yes.', 'You are still angry about it.'],
    inside: 'It kept quiet for you. It still knows every word.',
    strength: 'Voice', gives: 'Your own voice.',
    now: 'You say it on the day it happens. What is said does not turn into a grudge.',
  },
  {
    id: 'judgement', kind: 'judgement',
    lines: ['You see at once what is wrong with people.', 'You keep a list.', 'Your own name is at the top of it.'],
    inside: 'The hardest sentence was the one you passed on yourself.',
    strength: 'Discernment', gives: 'Seeing clearly, without the sentence.',
    now: 'You still see faults, your own and theirs. You no longer have to punish anyone for them.',
  },
  {
    id: 'envy', kind: 'envy',
    lines: ['People who show what they have bore you.', 'You know exactly what they have.'],
    inside: 'All along it was pointing at what you want.',
    strength: 'Desire', gives: 'Knowing what you want.',
    now: 'You stop counting what others have, and go after the thing itself.',
  },
  {
    id: 'shame', kind: 'shame',
    lines: ['People who make a scene make you look away.', 'No one has ever seen you fall.'],
    inside: 'It only ever hid what wanted to be seen.',
    strength: 'Seen', gives: 'Being seen.',
    now: 'You can be seen with your faults and stay in the room.',
  },
  {
    id: 'need', kind: 'need',
    lines: ['Needy people wear you out.', 'You have not asked for anything in years.'],
    inside: 'The hand it held out was your own.',
    strength: 'Receiving', gives: 'Being able to receive.',
    now: 'You ask before you are desperate. People find out they can give you something.',
  },
  {
    id: 'control', kind: 'control',
    lines: ['Careless people make you furious.', 'If you let go of one thing, everything goes.'],
    inside: 'It held everything, so that you would not feel it fall.',
    strength: 'Trust', gives: 'Trust.',
    now: 'You hold what is yours and let the rest move. Other people can breathe near you.',
  },
  {
    id: 'body', kind: 'anger',
    lines: ['People who live in their bodies embarrass you:', 'the loud laugh, the second helping, the sweat.', 'You have lived from the neck up for years.'],
    inside: 'It was never beneath you. It was carrying you the whole time.',
    strength: 'Instinct', gives: 'Being at home in your body.',
    now: 'Your body warns you before your head does, and you listen.',
  },
  {
    id: 'rest', kind: 'abandonment',
    lines: ['Lazy people make you angry.', 'You have not sat down without a reason since you were a child.'],
    inside: 'It was not idleness. It was the part of you that knew when to stop.',
    strength: 'Rest', gives: 'Rest, without earning it.',
    now: 'You stop before you break, and other people resting no longer offends you.',
  },
  {
    id: 'worth', kind: 'envy',
    lines: ['People who think they are special irritate you.', 'Quietly, you have always believed that you are.', 'You have never dared to find out.'],
    inside: 'It was not vanity. It was what you are for, kept in the dark.',
    strength: 'Worth', gives: 'Taking your own measure.',
    now: 'You do your own work at its real size, without needing to be above anyone.',
  },
  {
    id: 'softness', kind: 'abandonment',
    lines: ['Weak people embarrass you.', 'You have never once let yourself be carried.'],
    inside: 'It was not weakness. It was the only part of you that could be touched.',
    strength: 'Tenderness', gives: 'Letting yourself be touched.',
    now: 'You let someone carry you for a while, and you are no weaker for it.',
  },
  {
    id: 'cruelty', kind: 'anger',
    lines: ['Cruel people horrify you.', 'You know exactly which sentence would break each person you love.', 'You have known for years.'],
    inside: 'It was always there. Seen, it can no longer act without you.',
    strength: 'Choice', gives: 'Knowing what you could do, and choosing.',
    now: 'You know how hard you can hit. So your gentleness is a choice, and people can trust it.',
  },
  {
    id: 'truth', kind: 'confrontation',
    lines: ['Liars disgust you.', 'You tell each person what they want to hear,', 'and you call it kindness.'],
    inside: 'It learned to lie so that you would be loved. It remembers what is true.',
    strength: 'Truth', gives: 'Saying what is so.',
    now: 'Your yes means yes. People know where they are with you.',
  },
  {
    id: 'selfishness', kind: 'need',
    lines: ['Selfish people enrage you.', 'You can not remember the last thing you did only because you wanted to.'],
    inside: 'It was keeping your share for you, all this time.',
    strength: 'Mine', gives: 'Taking your own share.',
    now: 'You take your share openly, and what you give is a gift, with no bill to follow.',
  },
  {
    id: 'grief', kind: 'abandonment',
    lines: ['People who cry easily make you impatient.', 'There is a funeral you never went to.'],
    inside: 'It was not sadness you were spared. It was the love the sadness belongs to.',
    strength: 'Tears', gives: 'Being able to mourn.',
    now: 'What you lost can be mourned, and what you love can be loved all the way.',
  },
  {
    id: 'courage', kind: 'anger',
    lines: ['Fearful people irritate you.', 'You have arranged your whole life so that nothing in it can frighten you.'],
    inside: 'It was not the danger it feared. It was how much you wanted to go.',
    strength: 'Courage', gives: 'Going, afraid.',
    now: 'You can be afraid and go. The size of your life is no longer set by fear.',
  },
  {
    id: 'victim', kind: 'judgement',
    lines: ['People who are always the victim exhaust you.', 'You keep an exact account of what was done to you.', 'You read it every night.'],
    inside: 'It held the wound open so that someone would see it. You have seen it.',
    strength: 'Authorship', gives: 'Your life as your own doing.',
    now: 'It happened, and it was wrong. What you do next is yours.',
  },
  {
    id: 'play', kind: 'abandonment',
    lines: ['Childish people annoy you.', 'You stopped playing on a day you could still name.'],
    inside: 'It did not grow up because it was told to wait. It has been waiting.',
    strength: 'Play', gives: 'Play, for nothing.',
    now: 'You make things for no reason again, and new ideas come back with it.',
  },
  {
    id: 'coldness', kind: 'confrontation',
    lines: ['Cold people frighten you.', 'Something in you went quiet a long time ago,', 'and you called it calm.'],
    inside: 'It was not empty. It went numb so that you could get through.',
    strength: 'Feeling', gives: 'Feeling it.',
    now: 'You feel things while they happen, and the people near you can feel you there.',
  },
];

/**
 * After a shadow is taken back: its strength as the title, its `now` line, then one of these, in order
 * (the first shadow gets the first, and so on; after the third, none). What it is good for, as Jung saw it:
 * the shadow holds vitality as well as faults (CW 11, 134), and what is not known in oneself is met in
 * others as a projection (CW 9ii, 16-19).
 */
export const RETURNS = [
  'Keeping a part of yourself out of sight takes strength, every day. Jung saw that the shadow holds life as well as faults. That strength is yours again.',
  'What you do not know in yourself, you keep meeting in other people. Jung called it projection. Now you can see them more as they are.',
  'It is not gone, and it was never meant to go. But what you know in yourself no longer acts behind your back. You are less perfect now, and more whole.',
];

/** The same place, from the second round on (DISTIL): what going round again is for. */
export const RETURNS_AGAIN = [
  'Another heating. What is heavy sinks to the bottom of the glass, and you can see a little further into it.',
  'It is the same work, closer in. You notice the mask sooner, and it holds you less.',
  'Once, you would have fought what you met here. Now you recognise it. That is what distilling does.',
];

/**
 * Distillation and the rounds. The alchemists distilled the same matter over and over in a sealed glass
 * (circular distillation, done in the vessel called the Pelican, which Jung discusses: CW 9ii, CW 14), and
 * Jung read the alchemical work as a picture of the soul's. So playing again is the next distillation: the
 * house is the same, the masks faced before stay sealed, three others wait, and the light is a little clearer.
 * That each round leaves something heavy behind is the game's own image.
 */
export const DISTIL = {
  // after the first shadow of the first round, when the flask has gone back to its corner
  flask: {
    title: 'The flask',
    lines: [
      'The alchemists sealed a thing in glass and heated it, until it rose as vapour and fell back as clearer drops. They called it distillation.',
      'Jung saw in their work a picture of the soul. What you face goes into this flask: the heavy part sinks, the living part rises.',
    ],
  },
  // on the end card, under its own lines
  end: '<p><b>One distillation is done.</b> The alchemists never stopped at one. They poured the drops back and heated them again, and each time the matter was purer.</p><p>So with the soul. You go down, meet what is there, and come up with something left behind and something clear. Then you go down again.</p>',
  again: 'Distil again',
  stay: 'Stay a while',
  // under the buttons, when level II was opened by itself from the introduction page
  notCounted: 'You opened this level by itself, so this round is not counted.',
  name: (n) => `${['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'][n - 1] ?? 'A further'} distillation`,
  // the title card, from the second round on
  card: (n, turned) =>
    turned
      ? '<p>You have met every mask on these walls. They hang there again, and you are not the one who met them.<br /><b>Begin with the one that still stings.</b></p><p class="soft">The alchemists poured it all back, and lit the fire.</p>'
      : n === 2
        ? '<p>The same house. Your light is a little clearer.<br /><b>What you took back is mended with gold. Three other faces are waiting.</b></p><p class="soft">Each time, something heavy is left behind, and something clear rises.</p>'
        : '<p>The same house, the same stair. You know the way down now.<br /><b>That does not make it shorter. It makes it clearer. Three more are waiting.</b></p><p class="soft">Each time, something heavy is left behind, and something clear rises.</p>',
};

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
  wall: [
    'White masks are the faces you show the world. Jung called this the persona. Black masks, in the dark on both walls, are what you keep out of sight. He called that the shadow.',
    'You will know yours by what you cannot stand in other people. Read as many as you like. Take one that is yours, and face what comes of it.',
  ],
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
  // the first time a sealed letter is within reach (level II)
  letter: {
    desk: 'To pick up a letter, look down at it until your hand reaches for it, then click or press E.',
    touch: 'To pick up a letter, look down at it until your hand reaches for it, then tap Pick.',
  },
};

/**
 * Level II, albedo: the three sealed letters on the water (PLAN.md 10.5). Each is one way of
 * working with a dream (the infographic's second technique). Proposals, in the same voice.
 */
export const LETTERS = [
  {
    id: 'room', title: 'The Secret Room',
    lines: ['You dream of your own house, and find a door you never saw.', 'Behind it, a room that was always there.', 'Jung had this dream many times. The unknown wing, he wrote, was a part of himself he did not yet know.', 'Whatever you find in yours is a part of you not yet lived in.'],
  },
  {
    id: 'feeling', title: 'The Feeling of the Dream',
    lines: ['Something chases you through the night.', 'Do not ask what it was. Ask what you felt as you ran:', 'fear, or shame, or a strange relief.', 'For Jung a dream balances the day: it brings back what you left out.', 'The feeling is the letter. The story is only the envelope.'],
  },
  {
    id: 'other', title: 'The Other Role',
    lines: ['Jung read the people in a dream as parts of the dreamer.', 'So dream it again, as the one who chases.', 'Now you can see what it carried in its hands.', 'It was never trying to catch you. It was trying to give you something.'],
  },
];
export const ALBEDO = {
  title: 'II · Albedo',
  enter: 'Below the house the water is black and still.',
  // on the stair down, as a tip
  dream: 'In his dream, too, Jung went down under the house. Here, under the life you know, are your instincts, your dreams, and the one you are looking for in other people.',
  // the horse (PLAN.md 10.5, step 2): instinct met, not mastered
  horseLine: 'Stand still. Lower your eyes, and your light.',
  horsePushed: 'It will not be driven, and it will not let you past.',
  horseHint: 'It is afraid of your light. Stop, and lower your eyes.',
  horseCame: 'It came to you.',
  // said while it stands before you (Jung, CW 16, 347: the horse as the animal life of the body, a power that
  // carries one, and that startles; the light as thinking is this game's own image)
  horse: [
    { title: 'The Horse', lines: ['In dreams, Jung wrote, a horse is the animal life of the body: instinct, the power that carries you.', 'And like every instinct it startles. Drive it, and it bars the way.'] },
    { title: 'The Horse', lines: ['Your light is your thinking. It was too bright for it. You lowered it, and stood still, and instinct came to you by itself.', 'Your head does not know the way through this water. Your body does. Let it lead.'] },
  ],
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
      lines: ['It was furnished, and warm, and no one had lived in it.', 'It was always part of the house.', 'A talent, a wish, a life you put off: there is more room in you than you use.', 'It is yours now.'],
    },
    feeling: {
      line: 'Something is coming. Do not run. Choose what you feel.',
      words: { fear: 'Fear', shame: 'Shame', relief: 'Relief' },
      lines: {
        fear: ['Fear. And it stopped.', 'What chased you was the fear, running beside you.', 'Felt, it is only a feeling. Not felt, it runs your life from behind.'],
        shame: ['Shame. And it turned its face away, as you would.', 'It was ashamed too.', 'Felt, it is only a feeling. Not felt, it makes you hide from everyone.'],
        relief: ['Relief. And it stood still and lowered its head.', 'You had been waiting for it a long time.', 'What you run from is sometimes what you miss most.'],
      },
      title: 'The Feeling of the Dream',
    },
    other: {
      line: 'Now you are the one who follows. Something is in your hands.',
      give: 'It has stopped. Give it what you carry.',
      title: 'The Other Role',
      lines: ['It was never running from you.', 'You were bringing it something all along.', 'What frightens you in yourself is often a part that wants to come home.'],
    },
  },
  back: 'The door closes behind you. White comes into the flask.',
  hallOpen: 'At the end of the water, a door has opened.',
  statue: { goddess: 'On the column, a goddess shines gold. Hold your light on her face.', god: 'On the column, a god shines gold. Hold your light on his face.' },
  otherFar: 'Someone far off holds up a light of their own.',
  otherRecedes: 'The nearer you come, the further they go.',
  goldBack: 'A statue, not a god. The gold is in your own flask.',
  // shown as the gold comes back, one page after another (Jung: the contrasexual soul-image, met first as a
  // projection on someone else; unknown, the anima takes a man over as moods and the animus a woman as opinions
  // (CW 7, 296-340); made conscious, it is the bridge to one's own depths). Clinging, the steady strength and the
  // rest of what comes back are the owner's, and are not put in Jung's mouth. The name is cut into the column's
  // pedestal (gallery.js).
  projection: {
    goddess: [
      { title: 'The Anima', lines: ['Jung called her the anima: the feminine side of a man, the image of his own soul.', 'You did not know she was in you. So you saw her on a woman, shining gold, who could do no wrong. Until she was human, and you were disappointed.'] },
      { title: 'While she is not known', lines: ['She takes you over from behind: dark moods, touchiness, clinging, a need that no one can fill.', 'You ask another person to carry your soul for you. It is too heavy for anyone.'] },
      { title: 'The gold', lines: ['Now she is yours. Intuition, feeling, imagination, a sense for the magic in things: they lift you now, instead of breaking out as storms.', 'And your manhood can stand at ease: steady, warm, able to decide, to protect and to stay.'] },
      { title: 'The one across the hall', lines: ['The statue is stone. No woman has to be a goddess for you, or be blamed for not being one.', 'You can see who is really there, and meet her.'] },
    ],
    god: [
      { title: 'The Animus', lines: ['Jung called him the animus: the masculine side of a woman, her own spirit and her own word.', 'You did not know he was in you. So you saw him on a man, shining gold, who always seemed to know. Until he was human, and you were disappointed.'] },
      { title: 'While he is not known', lines: ['He takes you over from behind: hard opinions, quarrels that must be won, a judge inside that nothing satisfies, or years of waiting to be chosen.', 'You ask another person to carry your strength for you. It is too heavy for anyone.'] },
      { title: 'The gold', lines: ['Now he is yours. Courage, clear thought, direction, your own word: they carry you now, instead of turning against you and others.', 'And your womanhood can stand at ease: open, intuitive, warm, able to say no and to make what she imagines.'] },
      { title: 'The one across the hall', lines: ['The statue is stone. No man has to be a god for you, or be blamed for not being one.', 'You can see who is really there, and meet him.'] },
    ],
  },
  otherWaits: 'The one with the other light has stopped. They are waiting.',
  goToOther: 'Go to them.',
  bird: 'White.',
  follow: 'Follow them down.',
  done: 'The black has turned white.',
  endCard: '<p>The gold you put on another is back in your own vessel, and the black has turned white.</p><p>What you looked for in others is awake in you. You can love them now without asking them to complete you.</p><p class="soft">Someone with a light of their own walks beside you now.</p>',
  next: 'III · Rubedo · to come',
  pauseHow: 'Below the house: let the horse come to you, read the three letters and go through the doors they open, then take back the gold from the statue.',
};

/**
 * Level III, rubedo (PLAN.md 10.6, src/rubedo.js; only with ?rubedo until it is finished). The words of stage F1:
 * the way down, the cave and the way back. All proposals; what is Jung's and how far each claim is checked: PLAN.md 10.6.7.
 */
export const RUBEDO = {
  title: 'III · Rubedo',
  enter: 'Under the water, the rock is warm.',
  // on the stair, in place of Albedo's end card
  down: 'What you looked for in others is awake in you. Someone with a light of their own walks ahead.',
  // in the cave (Memories, Dreams, Reflections, ch. 5: thick dust, scattered bones, broken pottery)
  dream: 'The last stair of Jung\u2019s dream led to a cave: thick dust, old bones, broken pottery. He came to see it as the oldest part of the mind, the part all people share.',
  lines: {
    follow: 'Follow their light down.',
    toFire: 'Go to the furnace.',
    place: 'Set the flask on the furnace.',
    choose: { desk: 'Choose a strength for the fire. Look at it, and click or press E.', touch: 'Choose a strength for the fire. Tap it.' },
    hold: { desk: 'Hold the mouse button, or Space. Keep the flask in the middle.', touch: 'Keep your finger on the glass. Slide it to keep the flask in the middle.' },
    holding: 'Keep the flask in the middle.',
    dark: 'The dark pulls. Lean back.',
    white: 'The white pulls. Lean back.',
    again: 'Hold again, when you are ready.',
    latch: { desk: 'Press to hold. Press again to let go.', touch: 'Tap to hold. Tap again to let go.' },
    still: 'Hold.',
    child: 'Someone is waiting by the sack.',
    rope: 'It is holding out the rope. Take it.',
    untie: 'Untie it.',
    up: 'Go up. It is ahead of you.',
    home: 'Walk back to where you woke.',
  },
  // as a strength sinks into the coals, before a heating (by the strength's word, BLACK above)
  fire: {
    Force: 'Your no keeps the lid on.',
    Staying: 'You stay by the heat.',
    Voice: 'You can say that it burns.',
    Discernment: 'You see what is dark and what is light, and sentence neither.',
    Desire: 'Wanting burns well.',
    Seen: 'Nothing here has to hide.',
    Receiving: 'You do not have to carry the heat alone.',
    Trust: 'The fire knows its work.',
    Instinct: 'Your body knows how to stand in heat.',
    Rest: 'Hold it without straining.',
    Worth: 'What is in the glass is worth the fire.',
    Tenderness: 'What softens here does not break.',
    Choice: 'You could break it. You hold it.',
    Truth: 'No part of it is left out.',
    Mine: 'This fire is yours to keep.',
    Tears: 'Tears do not put it out.',
    Courage: 'You are afraid, and you stay.',
    Authorship: 'No one else can hold this for you.',
    Play: 'Look how it moves.',
    Feeling: 'You feel the heat, all of it.',
  },
  // the horned skull (skull.js). In nigredo the answer to the same question was yes
  skull: {
    tip: 'Something by the path is speaking. You do not have to answer.',
    offer: 'You have worked long enough. Put me on, and it is done.',
    question: 'Is this one yours?',
    choice: { take: 'Put it on', leave: 'This is not mine', takeKey: { desk: 'E', touch: 'tap' }, leaveKey: { desk: 'Q · right click', touch: 'tap' } },
    pick: 'Walk on.',
    worn: 'You can not take it off. There is one light you did not make. Go to it.',
    power: ['Everything obeys.', 'No one is near.'],
    none: 'You have met them all. So you must be above them.', // when no mask is left on the wall
    // what it whispers, for each black mask not faced: each one is a temptation, none of them is advice
    calls: {
      anger: 'One shout from me, and they would all be silent.',
      abandonment: 'Wear me, and you will need no one.',
      confrontation: 'You would never have to ask. They would know.',
      judgement: 'I have the list. Sentence them.',
      envy: 'Everything they have could be yours.',
      shame: 'No one dares to look at a face like mine.',
      need: 'They would come and beg.',
      control: 'Nothing moves unless I allow it.',
      body: 'I only hunger. I never blush.',
      rest: 'I do not sleep. Why should you?',
      worth: 'You always knew you were chosen.',
      softness: 'Nothing can touch me.',
      cruelty: 'You know the sentence. Say it.',
      truth: 'With me, what you say becomes true.',
      selfishness: 'Take it all. They would have.',
      grief: 'I have never lost anything.',
      courage: 'Let them be afraid instead.',
      victim: 'Now they will pay for it.',
      play: 'Break it. It is only a toy.',
      coldness: 'Here nothing is felt.',
    },
    // after "This is not mine" (Jung: the personal and the archetypal shadow, CW 9ii, 19; that it is left where it lies is the game's)
    left: [
      { title: 'The Horned One', lines: ['Your own shadow is your size. You can take it back.', 'Jung knew a second one, which belongs to no one: the dark that all people share. He called it archetypal.'] },
      { title: 'The Horned One', lines: ['It is strong, and it is not yours.', 'You do not fight it, and you do not wear it. You know that it is there.'] },
    ],
    // after wearing it (Jung: possession, CW 9i, 220 to 222; the rest is the game's)
    wore: [
      { title: 'Possession', lines: ['You did not wear it. It wore you.', 'Jung called it possession: something larger than you takes your place, and feels like your own strength.'] },
      { title: 'Possession', lines: ['It can be rage, or a cause, or being right, or being chosen. Everything obeys, and no one is near.', 'What you leave in the dark of your own house makes its voice louder.'] },
      { title: 'Possession', lines: ['What brought you back was a light you did not make.'] },
    ],
    again: 'It has fewer voices now. It will never have none.', // from the second time on, in place of the pages
  },
  // the pages. (J) marks what is said to be Jung's; the rest is the game's own and is not put in his mouth
  pages: {
    // once the furnace is lit (J: the sealed vessel, CW 12)
    vessel: [
      { title: 'The Sealed Vessel', lines: ['The alchemists sealed the glass before they lit the fire, so that nothing could escape.', 'Jung read the whole of their work as a picture of what happens in the soul.'] },
      { title: 'The Sealed Vessel', lines: ['What presses on you wants out: into a quarrel, an excuse, a screen. Here you keep it in.', 'This is not swallowing it. You feel all of it, and throw it at no one.'] },
    ],
    dark: [{ title: 'The Dark', lines: ['It wanted you to look at nothing else: what is wrong with you, and with everyone.', 'You felt its weight, and stayed.'] }],
    // (J: Eliade's interview of 1952, in C. G. Jung Speaking)
    white: [{ title: 'The White', lines: ['It was clean there, and nothing hurt. But no one lives in that light.', 'Jung said the white is still only an idea: it needs blood, the alchemists’ red, before it is life.'] }],
    // (J: the transcendent function, CW 8)
    both: [{ title: 'Both', lines: ['When two things in you contradict each other, you want to pick one and be done.', 'Jung found that if both are held, and neither is dropped, in time a third thing comes, and it is alive.'] }],
    // (J: CW 12, 334)
    reddening: [
      { title: 'The Reddening', lines: ['The white was clear, but cool. The alchemists raised the fire, and it turned red, like the sun coming up.'] },
      { title: 'The Reddening', lines: ['It is life coming back. What you understood, you now have to live: be warm, be involved, be hurt again.', 'Feeling returns to everything.'] },
    ],
    // (J: the union of opposites, CW 12, 14 and 16); man and woman, and then the same for both
    lights: {
      goddess: [
        { title: 'The Two Lights', lines: ['The alchemists drew it as the wedding of a king and a queen.', 'Jung read it as the joining of opposites in one person.'] },
        { title: 'The Two Lights', lines: ['She no longer goes ahead of you with a light you can not reach.', 'What she brought, feeling and imagination, burns in one fire with your will.'] },
      ],
      god: [
        { title: 'The Two Lights', lines: ['The alchemists drew it as the wedding of a king and a queen.', 'Jung read it as the joining of opposites in one person.'] },
        { title: 'The Two Lights', lines: ['He no longer goes ahead of you with a light you can not reach.', 'What he brought, courage and a clear word, burns in one fire with your feeling.'] },
      ],
      both: [{ title: 'The Two Lights', lines: ['So no one out there has to carry it for you.', 'You are free to see them, and they are free to be no more than they are.'] }],
    },
    // (J: the child archetype, CW 9i; the long bag is Robert Bly's image)
    child: [{ title: 'The Child', lines: ['You were small when you put the first thing in, because someone did not want it. The child has dragged it for you ever since.', 'A child in dreams and myths, Jung wrote, often points ahead: to what is still becoming in you.'] }],
    gold: [{ title: 'The Gold', lines: ['Too loud, too tender, too much: that is what went into the sack. It was heavy because it was gold.', 'The alchemists’ gold, Jung thought, was never only metal. It was something found in the soul.'] }],
    // (J: CW 9ii, 123; the last sentence is the game's)
    self: [
      { title: 'The Self', lines: ['Jung called the whole of a person the Self: what you know of yourself and what you do not, the dark with the light.'] },
      { title: 'The Self', lines: ['It is not a better you. He was careful about that: whole is not the same as perfect.', 'You do not own it. You make room for it.'] },
    ],
    // in the corridor, on the way back (J: CW 8, 432; CW 16, 454)
    changes: [
      { title: 'What it changes', lines: ['Nothing outside has changed. The same people will irritate you tomorrow.', 'But you will feel the heat a moment sooner and know it as yours, and in that moment you can choose.'] },
      { title: 'What it changes', lines: ['Becoming yourself, Jung wrote, does not shut the world out. It gathers the world in.', 'And no one becomes whole alone: you need the others, as they are.'] },
    ],
  },
  // from the second time in Rubedo, one line where a page was
  again: {
    vessel: 'You know this fire.',
    dark: 'It is the same dark. You know its weight.',
    white: 'Still beautiful. Still no one lives there.',
    both: 'Neither. Both. Wait.',
    reddening: 'Warm again.',
    lights: 'One fire.',
    child: 'It has grown.',
    gold: 'There was more.',
    self: 'Not perfect. A little more whole.',
    changes: 'The same door, the same people. A little more room.',
  },
  red: 'Red.',
  gold: 'Gold.',
  up: 'What went down in the dark goes up in the light.',
  masks: 'Faces. You can wear one when you need it, and hang it up again.',
  endCard: '<p>Black, white, red, gold.</p><p>You went down with a small light, into a house full of shut doors. You came up with what was behind them.</p>',
  level: 'III · RUBEDO',
  wakeByFire: 'Wake by the fire',
  pauseHow: 'Under the water: set the flask on the furnace and keep it in the fire. Then untie the sack, and go up.',
};

/** On the pause card: what the level asks of you, in one line. */
export const PAUSE_HOW = 'Read the masks. Take a black one that is yours, and face what it becomes: turn to it, hold your light on it, and walk into it. The door at the end opens after three.';

/** Small, under a text that has another after it or that is worth its time. */
export const GO_ON = { desk: 'click to go on', touch: 'tap to go on' };

/** How long a text stays on screen, in seconds. */
export const readingTime = (text) => 3 + 0.45 * String(text).trim().split(/\s+/).length;

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
  // where the game comes from: the house dream of 1909 (Jung, Memories, Dreams, Reflections, ch. 5)
  concept: [
    'In 1909 Carl Jung dreamed of a house he did not know, and yet it was his own. He went down through it, and every floor was older than the one above: rooms, a cellar, and under the cellar a cave.',
    'He came to see it as a picture of the mind. Above is what we know of ourselves. Below is what we have put away, and deeper still what all people share.',
    'This game is based on that dream. You go down into your own house, to meet what you put away there. It is the lead, and it can be turned to gold.',
  ],
  cards: [
    { num: 'I', name: 'Nigredo', sub: 'the blackening', text: 'The house. The faces you wear.', playable: true, at: null },
    { num: 'II', name: 'Albedo', sub: 'the whitening', text: 'The water. The Other.', playable: true, at: 'albedo' },
    { num: 'III', name: 'Rubedo', sub: 'the reddening', text: 'To come', playable: false, at: 'rubedo', textOn: 'The cave. The fire.' }, // chosen here; not on the main path
  ],
  begin: 'Begin',
  // the title card after a level card is picked (level I's is in index.html as it stands)
  start: {
    albedo: {
      level: 'II · ALBEDO',
      howto: '<p>Below the house the water is black and still. Your light floats beside you.<br /><b>A horse waits in the water, and three sealed letters float on it.</b></p><p class="soft">Go slowly, and lower your eyes when you are asked to.<br />Nothing is lost here. Only time.</p>',
    },
    rubedo: {
      level: 'III · RUBEDO',
      howto: '<p>Under the water there is a cave, and in it a furnace that has been cold a long time.<br /><b>Someone with a light of their own goes down ahead of you.</b></p><p class="soft">There is one thing down there to leave alone.<br />Nothing is lost here. Only time.</p>',
    },
    fire: {
      level: 'III · RUBEDO',
      howto: '<p>The dark stair, below the hall. The rock is warm.<br /><b>They are waiting for you further down.</b></p>',
    },
  },
  test: 'Prototype: try any level',
  testHint: 'for testing · your saved progress is not touched',
};
