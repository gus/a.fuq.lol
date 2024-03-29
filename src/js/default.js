const AUTOSAVE_MILLIS = 5000; // 5 seconds

const DefaultDocument = `
# Hello, World!

You have found **_Fuq Docs_**. Congratulations?

Well ... now you can edit notes in markdown and preview those rendered
notes. These documents never leave your browser profile. There are no ads. There
are no ad-trackers. There is no data collection of any kind.

You can't (currently) share your notes. This "app" gets completely out of
your way. Every document is stored in your browser's local-storage. Only.
It's only stored there. I want to reiterate, it is not stored anywhere else.
If you go to another laptop, you cannot access docs you edited on the other
one.

If you need an app where you can share a document, **do not use this app**.
There are some ideas in the works to share the content of a document, but ...
you will NEVER be able to live-edit a specific note with anyone else. I fully
expect to eat my words here.

Almost everything is supported via the keyboard. You can't do anything with
your mouse except choose a document to open and even that should stop soon,
hopefully. You can always key in \`Ctrl+/\` to see the available shortcuts,
but ... in case that's too much work right now, here are the current shortcuts:

| Command                  | Shortcut        |
| ------------------------ | --------        |
| Toggle the editor/reader | \`Ctrl+p\`      |
| Rename document...       | \`Alt+t\`       |
| Save document            | \`Alt+s\`       |
| New document             | \`Alt+n\`       |
| Delete document          | \`Alt+Delete\`  |
| Open document            | \`Alt+o\`       |
| Help                     | \`Alt+/\`       |
| Toggle light/dark mode   | \`Alt+Shift+m\` |
| About Fuq Docs           | \`Alt+Shift+?\` |

Try it now! Type \`Alt+n\` to start a new document. Make sure to set a title
or auto-save won't work.

## Markdown Support

You're probably thinking, _"Yeah, well, what dumb flavor of markdown is
supported"_. You're in luck, friend, it's the [Github Flavor](https://github.github.com/gfm/).
So you get all of the basic stuff and then some; like tables (see shortcuts
above), ~~strikethrough~~, highlighted code blocks, etc.

_"Tell me more about these code blocks."_ Okay. Well. Here's some Go code:

\`\`\`go
import (
    "fmt"
)

func main() {
    fmt.Printf("hello, %s", "world")
}
\`\`\`

Just edit (\`Alt+p\`) this document and you can see the source.

Okay, but _"What about images?"_. Easy, see, a not too annoying cat \`.gif\`:

![not annoying cat gif](https://media.giphy.com/media/26xBLq0QJdxy57CV2/source.gif)

## Asked & Answered

**Q: _"Who built this?"_**
A: I did. (or type \`Alt+Shift+?\` to get the actual details)

**Q: _"Why, though?"_**
A: I just needed an easy place to store notes without loading an app; or editing
some shared document with no one who even cares; or forgetting where I put a file; or
being tracked by who knows whom. I wanted Fuq Docs to be fast and opinionated.
Success?

**Q: _"Why are nearly all shortcuts modified with \`Alt\`?"_**
A: Basically, I didn't want to prevent common browser shortcuts from working; like
\`Ctrl+t\` for opening a new tab. And, I wanted the modifier to be consistent. _This
might change._

**Q: _"Why can't I delete any of these nonsense docs!"_** A: You will be able to soon!
I promise!

**Q: _"Why is the domain \`a.fuq.lol\`?"_** A: Naming things is hard.

**Q: _"How do you pronounce 'fuq'?"_** A: Umm ... your choice.

---

![Creative Commons License](https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png)

[Creative Commons License](https://creativecommons.org/licenses/by-nc-sa/4.0/)
`.trim();