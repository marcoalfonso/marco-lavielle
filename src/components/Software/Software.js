import React, { Component } from 'react'
import { connect } from 'react-redux'
import styles from './Software.scss'
import './Software.css'

export class Software extends Component {
  render() {
    return (
      <div>
        {/*<div className={styles.container}>
          <div className={styles.window}>
            <div className={styles.terminal}>
              <p className={styles.command}>git clone https://github.com/marcoalfonso/software</p>
              <p className={styles.log}>
                <span>
                  Cloning into 'software'...<br />
                  remote: Reusing existing pack: 1857, done.<br />
                  remote: Total 1857 (delta 0), reused 0 (delta 0)<br />
                  Receiving objects: 100% (1857/1857), 374.35 KiB | 268.00 KiB/s, done.<br />
                  Resolving deltas: 100% (772/772), done.<br />
                  Checking connectivity... done.
                </span>
              </p>
              <p className={styles.command}>rm -rf software</p>
            </div>
          </div>
        </div>*/}

        <div className="container sm-l sm-6 md-3 lg-3">
        	<div className="pad">
        		<br/>
        		<span className="grey oneliner sm-off">{'// Introduction --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------'}</span>
        		<span className="sm-off"><br/><br/></span>
        		<span className="blue"><em>{'function'}</em></span> <span className="green">musicProgramming</span>(<span className="orange"><em>task</em></span>)
        		<span className="sm-off">
        			<br/>{'{'}<br/>
        			<span className="string-indent">
        				{'task '}<span className="fuschia">=</span> {'('}task <span className="fuschia">===</span> <span className="purple">undefined</span>{') ? '}<span className="yellow">'programming'</span>{' : task;'}<br/>
        			</span>
        			<span className="string-indent">
        				<span className="fuschia">return</span>{' '}<span className="yellow">{'`A series of mixes intended for listening while '}</span><span className="fuschia">{' + '}</span>{'task'}<span className="fuschia">{' + '}</span><span className="yellow">{' to aid concentration and increase productivity (also compatible with other activities).`'}</span>{';'}<br/>
        			</span>
        			{'}'}<br/>
        		</span>
        		<span className="sm-only">
        			{'{'}<span className="fold">...</span>\}<br/>
        		</span>
        	</div>
        </div>

        <div className="container md-r sm-6 md-3 md-l lg-3 lg-r">
        	<div className="pad">
        		&nbsp;<br/>
        		<span className="grey oneliner">{'// --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------'}</span><br/>
        		<br/>
        		<span className="green">43: Hey Exit</span><br/>
        		<br/>
        				<audio src="http://datashat.net/music_for_programming_43-hey_exit.mp3" id="player">
        					Your browser does not support the &lt;<span className="fuschia">audio</span>&gt; tag.<br/><br/>
        				</audio>
        				<div className="playerControls noselect">
        					<pre className="grey" id="player_time">01:13:43</pre> <pre className="grey active" id="player_playpause">[PLAY]</pre> <pre className="grey" id="player_stop">[STOP]</pre> <pre className="grey" id="player_rew">[-30s]</pre> <pre className="grey" id="player_ffw">[+30s]</pre><br/>
        					<br/>
        				</div>
        						<a href="http://datashat.net/music_for_programming_43-hey_exit.mp3">music_for_programming_43-hey_exit.mp3</a> (106mb)<br/>
              <br/>
              Ensemble De Organographia - Salpinx call / The Sappho Painter (5th c. BC)<br/>
              Hey Exit - Our Ceiling Repairs<br/>
              Oven Rake - Swimming Pool<br/>
              Aki Onda - I Tell a Story of Bodies That Change (excerpt)<br/>
              The Carmelite Nun of Luçon - The Burden of the Day<br/>
              Grouper - Little Gray Cat<br/>
              Hey Exit - So They Spoke<br/>
              Geotic - Get Held<br/>
              Jozef Van Wissem - Without the Rose /  Iannis Xenakis - Bohor (excerpt)<br/>
              Nocturnal Emissions - Wikka Man<br/>
              Hey Exit - An American Flower<br/>
              Loren Connors - Pretty As Ever (4) / The Cart Ride<br/>
              Chieko Mori - Dreams<br/>
              Zero Kama - Town of Pyramids (Night of Pan)<br/>
              Danny Clay - Mt. Adams<br/>
              Oren Ambarchi - Trailing Moss In Mystic Glow (excerpt)<br/>
              The Test Results - Sisyphus2 (excerpt)<br/>
              Mamoru Fujieda - The Sixth Collection, Pattern XXI<br/>
              Khonnor - I Was Everything You Wanted Until I Quit<br/>
              Hey Exit - Small Burials<br/>
              Louis Andriessen - Deuxiéme Chorale<br/>
              <br/>
              Compiler link:<br/>
              <a href="http://www.heyexit.com/">{'http://www.heyexit.com/'}</a><br/>{'		'}<br/>
        		&nbsp;
        	</div>
        </div>

        <div className="container sm-l sm-6 md-3 md-r lg-3 lg-l">
        	<div className="pad">
        		&nbsp;<br/>
        		<span className="grey oneliner">{'// Episodes --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------'}</span><br/>
        		<br/>
        		<div id="episodes" className="multi-column">
        			<a href="?one">{'01: Datassette'}</a>
              <br/>
              <a href="?two">{'02: Sunjammer'}</a>
              <br/>
              <a href="?three">{'03: Datassette'}</a>
              <br/>
              <a href="?four">{'04: Com Truise'}</a>
              <br/>
              <a href="?five">{'05: Abe Mangger'}</a>
              <br/>
              <a href="?six">{'06: Gods Of The New Age'}</a>
              <br/>
              <a href="?seven">{'07: Tahlhoff Garten + Untitled'}</a>
              <br/>
              <a href="?eight">{'08: Connectedness Locus'}</a>
              <br/>
              <a href="?nine">{'09: Datassette'}</a>
              <br/>
              <a href="?ten">{'10: Unity Gain Temple'}</a>
              <br/>
              <a href="?eleven">{'11: Miles Tilmann'}</a>
              <br/>
              <a href="?twelve">{'12: Forgotten Light'}</a>
              <br/>
              <a href="?thirteen">{'13: Matt Whitehead'}</a>
              <br/>
              <a href="?fourteen">{'14: Tahlhoff Garten + Untitled'}</a>
              <br/>
              <a href="?fifteen">{'15: Dan Adeyemi'}</a>
              <br/>
              <a href="?sixteen">{'16: Silent Stelios'}</a>
              <br/>
              <a href="?seventeen">{'17: Graphplan'}</a>
              <br/>
              <a href="?eighteen">{'18: Konx Om Pax'}</a>
              <br/>
              <a href="?nineteen">{'19: Hivemind'}</a>
              <br/>
              <a href="?twenty">{'20: Uberdog'}</a>
              <br/>
              <a href="?twentyone">{'21: Idol Eyes'}</a>
              <br/>
              <a href="?twentytwo">{'22: Mindaugaszq'}</a>
              <br/>
              <a href="?twentythree">{'23: Panda Magic'}</a>
              <br/>
              <a href="?twentyfour">{'24: RITES'}</a>
              <br/>
              <a href="?twentyfive">{'25: _nono_'}</a>
              <br/>
              <a href="?twentysix">{'26: Abstraction'}</a>
              <br/>
              <a href="?twentyseven">{'27: Michael Hicks'}</a>
              <br/>
              <a href="?twentyeight">{'28: Big War'}</a>
              <br/>
              <a href="?twentynine">{'29: Luke Handsfree'}</a>
              <br/>
              <a href="?thirty">{'30: Matt Kruse'}</a>
              <br/>
              <a href="?thirtyone">{'31: Datassette'}</a>
              <br/>
              <a href="?thirtytwo">{'32: Chris Seddon'}</a>
              <br/>
              <a href="?thirtythree">{'33: uuav'}</a>
              <br/>
              <a href="?thirtyfour">{'34: Chukus'}</a>
              <br/>
              <a href="?thirtyfive">{'35: Nadim Kobeissi'}</a>
              <br/>
              <a href="?thirtysix">{'36: Ea7_dmZ'}</a>
              <br/>
              <a href="?thirtyseven">{'37: Lackluster'}</a>
              <br/>
              <a href="?thirtyeight">{'38: J.S. Aurelius'}</a>
              <br/>{'		'}</div>
        	</div>
        	<div className="pad">
        		<br/>
        		<span className="grey oneliner">{'// Meta --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------'}</span><br/>
        		<br/>
        		<a href="MFP_01-52.torrent" className="fuschia-link">[MFP_01-52.torrent]</a>
        		<br/>
        		<a href="?about" className="purple-link">[About]</a>{' '}<a href="?credits" className="purple-link">[Credits]</a>{' 		'}<a href="img/folder.jpg" className="purple-link">[folder.jpg]</a>
        		<a href="rss.php" className="purple-link">[RSS]</a>{' '}
        		<a href="monokai_datashat_edit.tmTheme" className="purple-link">[SublimeText.tmTheme]</a>
        		<br/>
        		<a href="http://itunes.apple.com/us/podcast/music-for-programming/id500565620" className="blue-link">[iTunes]</a>{' '}
        		<a href="https://www.facebook.com/musicforprogramming" className="blue-link">[Facebook]</a>{' '}
        		<a href="https://twitter.com/datassette" className="blue-link">[Twitter]</a>
        		<br/>
        		<a href="http://datassette.net/businessfunk/" className="orange-link">[Enterprise Mode]</a>{' '}
        		<a href="#" id="themeLink" className="orange-link">[Switch Theme]</a>
        		<br/>&nbsp;
        	</div>
        </div>
      </div>
    )
  }
}

const mapStateToProps = state => ({
})

const mapDispatchToProps = dispatch => ({
})

export default connect(mapStateToProps, mapDispatchToProps)(Software)
