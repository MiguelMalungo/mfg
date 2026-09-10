import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import SplashCursor from './components/SplashCursor';
import GridDistortion from './components/GridDistortion';
import BuyButton from './components/BuyButton';
import AudioPlayer from './components/AudioPlayer';

function App() {
  // Array of poems
  const [poems] = useState([
    {
      id: 1,
      title: "",
      content: "AND SAIL AN OCEAN OF YOUTH\nPUSHING BELOW AS ABOVE\nMY JOURNEY'S EFFORTS FOUND TRUTH\nAND PASSING TRUTH I FOUND LOVE"
    },
    {
      id: 2,
      title: "",
      content: "MY ACTIONS MATERIALIZING\nTHE ENERGY MY BEING'S SENDING\nOTHERWISE ALL BECOMES NOTHING\nI'M JUST ACTING ON PRETENDING"
    },
    {
      id: 3,
      title: "",
      content: "WE CALL IT TRUTHS AND INVENT\nCOHERENCE WITHIN A RING\nPHILOSOPHIZING, IMAGINING...\nTO KNOW, NOT KNOWING A THING"
    },
    {
      id: 4,
      title: "",
      content: "THE CREATION COSMIC CYCLE\nI CHOOSE TO JOIN IN EACH DAY\nLIFE IS A SERIOUS MATTER\nI SHOULD TAKE IT AS PURE PLAY"
    },
    {
      id: 5,
      title: "",
      content: "HOW WILL I ARRIVE IN HEAVEN\nTHAT EXPECTED DAY AND SUCH\nTHAT I NEVER STOP TO SIN\nON THIS EARTH I WANT SO MUCH"
    },
    {
      id: 6,
      title: "",
      content: "PLACE THE TWO OPTIONS SIDE BY SIDE\nA PREFERENCE IS CLEAR AND TRANSPIRES\nIF NOT TOSS A COIN AND BEFORE LANDING\nYOU'LL KNOW WHAT YOUR HEART DESIRES"
    },
    {
      id: 7,
      title: "",
      content: "DON'T GET TOO ATTACHED TO TRUTHS\nOR WHAT YOU BELIEVE YOU'VE SEEN\nNEVER FORGET WHAT YOU ARE\nA STORY TELLING MACHINE"
    },
    {
      id: 8,
      title: "",
      content: "THE MOON OFFERED ME THIS TASK\nSEE A FUTURE WORLD OF BLISS\nDESCRIBE IT IN PRESENT TENSE\nCRAFT IT ACCEPTING WHAT IS"
    },
    {
      id: 9,
      title: "",
      content: "LIVING. DREAMING. THINKING.\nWONDERING WHAT AM I? WHAT IS TO BE?\nDO I IMAGINE A GOD?\nOR THE GODDESS IS DREAMING ME?"
    },
    {
      id: 10,
      title: "",
      content: "CREATIVITY IS ALWAYS THERE\nTHE SOURCE WILL NEVER BE SEALED\nUNBOLT THE DOORS OF PERCEPTION\nAND ANSWERS WILL BE REVEALED"
    },
    {
      id: 11,
      title: "",
      content: "FOR A LOVE COMPLETE AND TOTAL\nLOVE LOVING ITSELF SHOULD OCCUR\nTHE LOVER LOVING IN THE LOVED ONE\nTHE LOVER THAT LOVES HIM OR HER\nAND BOTH BE LOVING IN THEMSELVES\nTHE LOVER THEIR LOVERS LOVE\nAND SINCE LOVE STRIKES UNSPOKEN\nI'LL FORGET ALL THE ABOVE"
    },
    {
      id: 12,
      title: "",
      content: "THE ONLY CONSTANT IS CHANGE\nOLD WAYS MAY NOT BE THE BEST\nIF LIGHTNING FATE STRIKES THIS EASTER\nREHASH IT ALL IN THE WEST"
    },
    {
      id: 13,
      title: "",
      content: "LIFE FOR ME IS SUCH A LOVE\nMY LOVE FOR LIFE I MUST SHOUT\nWELL ALIVE WHEN DEATH MAY COME\nIN DEATH ITSELF LIFE SHINES OUT"
    },
    {
      id: 14,
      title: "",
      content: "IT'S NOT HARD TO FIND YOUR PEOPLE\nBUT TO FEEL AND TREAT THEM RIGHT\nLIKE YOU ARE BOUND FOR ETERNITY\nAND YES... THERE'S LOVE AT FIRST SIGHT"
    },
    {
      id: 15,
      title: "",
      content: "I DO NOT CRAVE ANY POWER\nJUST FREEDOM SO ME AND YOU\nMAY SPEAK TO THE ONES IN POWER\nABOUT WHAT WE THINK ITS TRUE"
    },
    {
      id: 16,
      title: "",
      content: "TO HAVE CONTROL OF YOUR ACTING\nAN AMAZING THING TO DO\nIT CAN HAPPEN THAT THE ACTOR\nWILL TAKE OVER, CONTROLS YOU!"
    },
    {
      id: 17,
      title: "",
      content: "UNEXPECTED THINGS DO HAPPEN\nWHICH ALWAYS RAISE THE HEARTS BEATINGS\nREMINDS US OF POSSIBILITIES\nAND OF IMPOSSIBLE MEETINGS"
    },
    {
      id: 18,
      title: "",
      content: "LIKE THERE ARE NEVER BAD WINDS\nAND YOU KNOW WHERE YOU SHOULD GO\nNOT TRYING TO LEAD EVENTS\nBUT BEING ONE WITH THEIR FLOW"
    },
    {
      id: 19,
      title: "",
      content: "I SLEEP WELL IN THIS ILLUSION\nTHE GODDESS DREAMS ME TO BE\nWELL ALIVE INSIDE OF HER\nAND SHE WATCHES OVER ME"
    },
    {
      id: 20,
      title: "",
      content: "A FULL FORMED SONG IN A DREAM\nSPONTANEOUS DANCE THAT RELEASES\nVERY ORDINARY MOMENTS\nMAKE FOR GREAT CREATIVE PIECES\nNOT READY? HAS ONE MISTAKE?\nIT MIGHT BE PERFECT WITH FIVE\nSWIMMING TOO HARD TYRES... SINKS\nBETTER SURF THE WAVE OF LIFE"
    },
    {
      id: 21,
      title: "",
      content: "IT'5 YOUR AUTOBIOGRAPHY\nSTILL I LIKE TO HEAR YOU. MAN..\nIN YOUR OWN WAY AND LIKE, LIKING\nTHAT WHAT YOU SUPPOSE I AM"
    },
    {
      id: 22,
      title: "",
      content: "BY WHIPLASHES OF HERESY\nTHEY CUTTED THE CHAINS OF PERCEPTION\nWHERE NO LONGER SLAVES OF FANTASY\nBUT GODS OF MAGINATION"
    },
    {
      id: 23,
      title: "",
      content: "FROM THIS PALETTE OF EXPERIENCES\nAND THE TONES WEVE BEEN CREATING\nWE TUNE TO MAKE THIS UNIQUE\nLIFE JUST LIKE A MOVING PAINTING"
    },
    {
      id: 24,
      title: "",
      content: "FROM ALL YOUR PHILOSOPHIES\nYOUR THEOLOGIES AND ART\nEVERYTHING YOU THINK IS GOD\nIS OF GOD A TINY PART"
    },
    {
      id: 25,
      title: "",
      content: "WHEN YOU'RE TRYING TO FIND LOVE\nMAPS WON'T TELL YOU WHERE IT IS\nYOU WAIT FOR THE GODDESS WILL\nTO SHOW YOU WHEN SHE WELL PLEASE"
    },
    {
      id: 26,
      title: "",
      content: "MORE THAN IN YOUR GOD BELIEVE\nTHE FAITH YOU ARE AND YOU ACT\nMAYBE THE GOD YOU HAVE FAITH IN\nCOVERS THE GOD GOD'S IN FACT"
    },
    {
      id: 27,
      title: "",
      content: "YES THAT ONE I KNOW HER WELL\nSHES DAMNED LIKE THE WORST EVER\nBUT MAYBE IMPROVING MYSELF\nWOULD HELP HER TO TURN OUT BETTER"
    },
    {
      id: 28,
      title: "",
      content: "AM NOT POLITE! IM NOT RUDE!\nI'M NEITHER STUPID NOR SMART\nJUST A PRODUCT OF THE MEDIUM\nWHERE IVE BEEN RAISED FROM THE START\n\nCALL ME CRAZY, VAGABOND...\nA CHRISTIAN, BUDDHIST WHAT NOT\nMONARCH, ANARCHO DEMOCRAT\nA MIX OF THE GOOD THOSE GOT\n\nOR CALL ME BLASPHEMOUS DEVIL\nFOR THE PREACHINGS I DON'T HEAR\nI DON'T BELIEVE IN THAT GOD\nTHAT YOU BARGAIN WITH ON FEAR\n\nWHAT I BELIEVE IS NOT DEFINED\nDOES NOT DEMAND ME FOR PROOFS\nTHE WORLD STANDS IN ITS ETERNITY\nIT'S IN EVERYTHING THAT MOVES"
    },
    {
      id: 29,
      title: "",
      content: "DON'T YOU THINK TOO MUCH MY FRIEND\nAND REST THE MIND GOLDEN BRIGHT\nALLOWING IDEAS AND VISIONS\nTO BE REVEALED... COME TO LIGHT!"
    },
    {
      id: 30,
      title: "",
      content: "FOR MOST OF MY ALTRUISMS\nHAD GESTURES OF DOMINATION\nOBSTRUCTED ON OTHERS LIVING\nDESTRUCTIVE HELPING SENSATION"
    },
    {
      id: 31,
      title: "",
      content: "WATCH THE CLOUDS. THE STARS. THE SEA\nTHEIR COURSES AND HIGHEST POWER\nWASH AWAY DUSTY DESIRES\nAND ETERNALIZE THE HOUR"
    },
    {
      id: 32,
      title: "",
      content: "NOT A COLOR IN NO BOX\nLIKE SO MANY... JUST SOMEONE.\nLIKE THERE ARE TRILLIONS OF STARS\nAND THERE IS ONLY ONE SUN"
    },
    {
      id: 33,
      title: "",
      content: "EMBRACED MY FATE... RESURRECTED!\nCRYSTAL CLEAR I COULD FORESEE\nTHAT DAY I'IL BELONG TO THAT OTHER\nWHICH IS ALL THAT SURROUNDS ME\n\nHUMANS, ANIMALS AND PLANTS\nEVEN THE STARS AND THE SEA\nYES... I WILL NOT LOOSE MYSELF...\nFROM THAT OTHER I WILL BE"
    },
    {
      id: 34,
      title: "",
      content: "MAKE ROOM IN YOUR HOUSE FOR YOUR MUSE\nTHEN LET HER INSPIRE YOU... CHILL!\nDON'T TRY TO OWN HER... YOU'LL LOOSE HER\nAND ALL SHE COULD MAKE YOU FEEL"
    },
    {
      id: 35,
      title: "",
      content: "LOVE IS THE ULTIMATE ANSWER\nAND CAN FILL YOU UP AT WILL\nMAY YOU ONE DAY COME TO SEE\nTHAT ONLY THE VOID IS REAL"
    },
    {
      id: 36,
      title: "",
      content: "IM WEEDING ALL THOSE OPINIONS\nGROWN IN MY GARDEN OF CHOICE\nTELLING ME OF GOODS AND EVILS\nSHUTTING OFF MY INNER VOICE"
    },
    {
      id: 37,
      title: "",
      content: "THE ARTIST CAN NOT CONTAIN IT\nAND GOES ON TRYING TO SHOW\nTHAT WHAT WE STILL CANNOT SEE\nALTHOUGH WE ALREADY KNOW"
    },
    {
      id: 38,
      title: "",
      content: "THE UNIVERSE NEVER ASKS WHY\nAVOID BRINGING TOO MUCH LOAD\nLETS MARCH TILL THE UNKNOWN... TOGETHER\nWE ARE ALL ONE UP THIS ROAD"
    },
    {
      id: 39,
      title: "",
      content: "YOU SAY THAT I TRANSMIT LIGHT\nBUT THAT IS NOT WHAT I DO\nI ONLY, SOMETIMES, JUST MIGHT\nUNHIDE THE LIGHT THERE'S IN YOU"
    },
    {
      id: 40,
      title: "",
      content: "MY CAT NEVER TOLD HIS NAME\nOUR STORIES FOR HIM DO NOT MATTER\nNOT KNOWING MATHS OR PHILOSOPHY\nHE FULFILLS HIMSELF WAY BETTER"
    },
    {
      id: 41,
      title: "",
      content: "CIRCUMSTANCES ARE JUST THERE\nPUZZLE PIECES FOR YOUR FATE\nTHE FINAL IMAGE!? WHO KNOWS..\nIMAGINE IT! CREATE"
    },
    {
      id: 42,
      title: "",
      content: "TO GET INTO THE DEPTHS OF REALITY\nBY NAVIGATING THE WAY\nBETWEEN HUMAN AND DIVINE\nFINDING WHERE THESE INTERPLAY"
    },
    {
      id: 43,
      title: "",
      content: "WHEN YOU'RE ABOUT TO FUCK UP\nAND YOUR HEART SAYS \"THAT'S NOT IT!\"\nIMAGINE IT'S YOUR SECOND LIFE\nAND DO NOT REPEAT THAT SHIT"
    },
    {
      id: 44,
      title: "",
      content: "THERE ARE MYSTERIOUS FORCES\nDRIVING WHERE THIS WHOLE THING GOES\nACCORDING TO GODS MASTERPLAN\nAND THE DEVIL ONLY KNOWS"
    },
    {
      id: 45,
      title: "",
      content: "EVERY MOMENT IS SUFFICIENT\nOUTSIDE OUR MINDS FABRICATION\nALL THAT WE CALLED EVOLUTION\nAS A CONTINUOUS CREATION"
    },
    {
      id: 46,
      title: "",
      content: "SAME I THAT THROWS COINS IN FOUNTAINS\nSINGS MANTRAS AND KNEELS IN CHURCH\nGETS AMAZED BY ARTS AND SCIENCE\nROAMS THE WORLD IN INNER SEARCH"
    },
    {
      id: 47,
      title: "",
      content: "WOMAN: A LOVING SAPTIAL DREAMING BEING\nTHAT CARRIES CROSSES\nWITH AN UNCONFESSED MADDENING THORN\nSWEET SUFFERING\nTAKEN TO A BLACK PLACE.... MAN UNSEING, WHERE DEATH FLIES BY,\nTHERE WHERE BOYS AND GIRLS COME BORN"
    },
    {
      id: 48,
      title: "",
      content: "YES I'M A SAILOR!.. PORTUGUESE!\nI DREAM OF THE FUTURE PAST\nWHERE BY THE SEAS SALTY BREEZE\nMANKIND WILL BE FREED AT LAST"
    },
    {
      id: 49,
      title: "",
      content: "IF I DO NOT MERGE WITH YOU\nI CAN ONLY GET AS FAR AS\nTO MEASURE WHAT YOU DO\nNEVER REACHING WHAT YOU ARE"
    },
    {
      id: 50,
      title: "",
      content: "THIS NEED FOR THE UPPER HAND\nLIKE A DOG GUARDING THE BONE.\nDEAR EGO YOU TOOK ME THIS FAR\nBUT YOU LEFT ME HERE!... ALONE"
    },
    {
      id: 51,
      title: "",
      content: "THE 5TH AND THE LAST EMPIRE\nKINGDOM OF SURROUNDING LOVE\nIMMUNE TO THE PESTS OF DOMINANCE\nHUMAN RACE RISING ABOVE"
    },
    {
      id: 52,
      title: "",
      content: "LET'S RESTART THE CONVERSATION\nAS TWO PAIRED VIBRATING LEAVES\nLISTENING WITH OUR WHOLE BODIES\nSUSPENDING THE DISBELIEFS"
    },
    {
      id: 53,
      title: "",
      content: "ACCEPT THE NATURAL RHYTHMS\nWE HAVE NO CONTROL OVER TIME\nCANT FORCE GREATNESS TO HAPPEN\nPATIENCE INVITES THE SUBLIME"
    },
    {
      id: 54,
      title: "",
      content: "LED BY REFINED SENSITIVITY\nTHE ATTUNED CHOOSING OF THE HEART\nOUR WHOLE LIFE AS SELF EXPRESSION\nA SINGULAR WORK OF ART"
    },
    {
      id: 55,
      title: "",
      content: "THE ECSTATIC IS ANIMALISTIC\nANSWERS WILL EMERGE... YOU KNEW!\nTAKES YOU OUT BEYOND THE STARS\nSOMEWHERE DEEP INSIDE OF YOU"
    },
    {
      id: 56,
      title: "",
      content: "DECIDE AS KING. FIRM AND FAIR FREE...\nIMMERSED IN NATURES FLOW\nYOU WILL HONOR YOUR COMMITMENTS\nYOU WILL KNOW WHEN TO LET GO"
    },
    {
      id: 57,
      title: "",
      content: "TEMPERING OUR OPPOSITE FLUXES\nWE FEEL... AS THE WORLD KEEPS SPINNING\nTHE ENERGY OF RISING TO MEET\nVIBRATES HIGHER THAN OF WINNING"
    },
    {
      id: 58,
      title: "",
      content: "AS THE LIGHT SOURCE STRIKES MY PRISM\nI PROJECT MY WORLD AND MOMENTS\nCREATING KALEIDOSCOPICALLY\nAS WIDE AS MY VISION OPENS"
    },
    {
      id: 59,
      title: "",
      content: "BURY ALL THE POINTS YOU'VE MADE\nAND SPROUT A NEW POINT OF VIEW\nEXPRESSING ALONG THIS JOURNEY\nAT EACH MOMENT A NEW YOU"
    },
    {
      id: 60,
      title: "",
      content: "I THINK THEREFORE SOMETHING MIGHT\nEXIST AND BE THINKING ME\nTHEN I KNOW I AM WHILE THINKING\nME AND ALL AROUND TO BE"
    },
    {
      id: 61,
      title: "",
      content: "THE UNIVERSE IS ALWAYS TRANSMITTING\nSET YOUR CHANNEL WITH INTENTION\nSIT IN NATURE, RUN IN CROWDS\nTHERES PATTERNS IN EACH DIMENSION"
    },
    {
      id: 62,
      title: "",
      content: "IF BEAUTY IS IN THE GAZERS EYE\nTHEN IM BLINDLY STUNNING AS SUCH\nTHAT I DON'T KNOW IF YOU'RE BEAUTIFUL\nBECAUSE I LOVE YOU TOO MUCH"
    },
    {
      id: 63,
      title: "",
      content: "ALL BOTH BEING AND NON BEING\nBECAUSE THEY CREATE EACH OTHER\nWE´RE PART OF WHAT LASTS FOREVER\nYOU'RE CO-CREATING ME, BROTHER!"
    },
    {
      id: 64,
      title: "",
      content: "LEARN THAT EVERYONE ELSE IS YOU\nUNDER A DIFFERENT AVATAR\nLEARN TO LOVE EVERYONE ELSE\nBY LOVING YOURSELF! ...AS YOU ARE"
    },
    {
      id: 65,
      title: "",
      content: "DOESN'T MATTER TO HAVE LIVED\nMATTERS TO LIVE... AND TO FEEL...\nSOMETHING IS DIFFERENT OUTSIDE\nTHEN YOU'RE LIVING... SOMETHING REAL!"
    },
    {
      id: 66,
      title: "",
      content: "I DONT BELIEVE GOD CAN TALK\nAND IM SURE THAT HE DONT WRITE\nJUST THAT WHAT KEEPS ME ALIVE\nIS HER EMANATING LIGHT"
    }
  ]);
  
  const [activePoem, setActivePoem] = useState(null);
  const poemRefs = useRef([]);
  
  // Initialize refs array
  useEffect(() => {
    // Initialize the refs array if it doesn't exist
    if (!poemRefs.current) {
      poemRefs.current = [];
    }
    
    // Ensure the array has the correct length
    if (poemRefs.current.length !== poems.length) {
      poemRefs.current = Array(poems.length)
        .fill()
        .map((_, i) => poemRefs.current[i] || React.createRef());
    }
  }, [poems.length]);
  
  // Scroll to poem when clicking on sidebar link
  const scrollToPoem = (poemId) => {
    const poemIndex = poems.findIndex(poem => poem.id === poemId);
    if (poemIndex !== -1 && poemRefs.current && poemRefs.current[poemIndex] && poemRefs.current[poemIndex].current) {
      poemRefs.current[poemIndex].current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActivePoem(poemId);
    } else {
      // Fallback to scrolling by ID if ref is not available
      const element = document.getElementById(`poem-${poemId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActivePoem(poemId);
      }
    }
  };
  
  // Update active poem on scroll
  useEffect(() => {
    const handleScroll = () => {
      // Safety check to ensure poemRefs.current exists
      if (!poemRefs.current) return;
      
      const scrollPosition = window.scrollY;
      
      // Find the poem that is currently in view
      let currentPoem = null;
      let closestDistance = Infinity;
      
      // Loop through each poem ref
      poemRefs.current.forEach((ref, index) => {
        // Check if the ref exists and has a current property
        if (ref && ref.current) {
          try {
            const element = ref.current;
            const { top, bottom } = element.getBoundingClientRect();
            const elementCenter = (top + bottom) / 2;
            const distanceFromCenter = Math.abs(elementCenter - window.innerHeight / 2);
            
            // If this element is closer to the center of the viewport than any previous element
            if (distanceFromCenter < closestDistance && top < window.innerHeight && bottom > 0) {
              closestDistance = distanceFromCenter;
              // Get the actual poem ID from the poems array
              currentPoem = poems[index].id;
            }
          } catch (error) {
            console.error('Error calculating poem position:', error);
          }
        }
      });
      
      if (currentPoem !== null && currentPoem !== activePoem) {
        setActivePoem(currentPoem);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Call once on mount to set initial active poem
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activePoem]);

  return (
    <div className="App">
      {/* Audio player with improved mobile touch handling */}
      <AudioPlayer 
        audioSrc="/media/audio.mp3" 
        fadeInDuration={800} 
        fadeOutDuration={1500} 
      />
      <SplashCursor />
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-content">
          <div className="sidebar-logo">
            <img
              src="/media/blocks.webp"
              alt="BLOCKS"
              className="sidebar-logo-image"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/60x200?text=BLOCKS';
              }}
            />
          </div>
          <nav className="poem-nav">
            <ul>
              {poems.map((poem) => (
                <li key={poem.id} className={activePoem === poem.id ? 'active' : ''}>
                  <a 
                    href={`#poem-${poem.id}`}
                    className="poem-nav-link"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToPoem(poem.id);
                    }}
                  >
                    {poem.id}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>
      
      <main className="content">
        {/* Book Cover */}
        <section className="book-cover">
          
          <div className="cover-video-container">
            <video 
              src="/media/video.mp4" 
              className="cover-video"
              autoPlay
              muted={true}
              loop
              playsInline
              preload="auto"
              volume={0}
            >
              Your browser does not support the video tag.
            </video>
          </div>
          
          <div className="cover-image-container">
            <img
              src="/media/blocks.webp"
              alt="BLOCKS"
              className="cover-image blocks-image"
              loading="eager"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/400x600?text=BLOCKS';
              }}
            />
            <div className="author-name">MIGUEL FERRAZ GUEDES</div>
          </div>
        </section>
        
        {/* Poems */}
        {poems.map((poem, index) => (
          <React.Fragment key={poem.id}>
            <section 
              ref={(el) => (poemRefs.current[index] = el)}
              className="poem-section"
              id={`poem-${poem.id}`}
            >
              <div className={`poem-container ${[2, 4, 6, 8, 10, 12, 14, 16, 18, 22, 24, 26, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66].includes(poem.id) ? 'with-image' : ''} landscape-fix`}>
                <div className="poem-text-container">
                  <div className="poem-number">{poem.id}</div>
                  <div className="poem-content">
                    {poem.content}
                  </div>
                </div>
                {[2, 4, 6, 8, 10, 12, 14, 16, 18, 22, 24, 26, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66].includes(poem.id) && (
                  <div className="poem-image">
                    <div className="distortion-container-wrapper">
                      <GridDistortion
                        imageSrc={`/media/images/${[30, 32, 42, 44, 46, 52, 54, 56, 58, 60, 62, 64, 66].includes(poem.id) ? `${poem.id} copy` : poem.id}.webp`}
                        grid={15}
                        mouse={0.1}
                        strength={0.15}
                        relaxation={0.9}
                        className="poem-illustration-distortion"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>
            {/* Add BUY BOOK button after odd-numbered poems (1,3,5...) */}
            {poem.id % 2 === 1 && poem.id < poems.length && (
              <section className={`buy-button-section ${poem.id === 65 ? 'final-buy-button' : ''}`}>
                <BuyButton />
              </section>
            )}
          </React.Fragment>
        ))}
        
        <footer>
          <p>&copy; {new Date().getFullYear()} BLOCKS Poetry Book</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
