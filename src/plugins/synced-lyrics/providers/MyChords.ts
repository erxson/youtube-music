import type { LyricProvider, LyricResult, SearchSongInfo } from '../types';

export class MyChords implements LyricProvider {
  public name = 'MyChords';
  public baseUrl = 'https://mychords.net';
  private domParser = new DOMParser();

  // prettier-ignore
  async search({ title, artist }: SearchSongInfo): Promise<LyricResult | null> {
    const query = `${artist} ${title}`;

    const response = await fetch(`${this.baseUrl}/ru/ajax/autocomplete`, {
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-requested-with': 'XMLHttpRequest',
      },
      body: 'q=' + encodeURIComponent(query),
      method: 'POST'
    });
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as MyChordsSearch;
    const hits = data.suggestions.filter((hit) => hit.data.group === '\u041f\u0435\u0441\u043d\u0438');

    const closestHit = hits.at(0);
    if (!closestHit) {
      return null;
    }

    const html = await fetch(`${this.baseUrl}${closestHit.data.url}`).then((res) => res.text());
    const doc = this.domParser.parseFromString(html, 'text/html');

    const songTitle = doc.querySelector('.b-title--song')?.textContent?.trim();
    const artists = songTitle?.split(' - ')?.[0]?.trim()?.split(', ') ?? [];
    const songName = songTitle?.split(' - ').slice(1).join(' - ') ?? '';

    const lyrics = Array.from(
      doc.querySelector('.w-words__text')?.querySelectorAll('.single-line, .pline') ?? []
    ).map((div) => {
      const chords = Array.from(div.querySelectorAll('.b-accord__symbol'))
        .map((span) => span.textContent)
        .join(' ');
    
      let text = '';
      if (div.classList.contains('single-line')) {
        text = div.textContent?.trim() ?? '';
      } else {
        text = Array.from(div.querySelectorAll('.subline'))
          .filter((span) => !span.querySelector('.b-accord__symbol'))
          .map((span) => span.textContent?.trim())
          .join(' ');
      }
    
      return chords ? `[${chords}]\n${text}` : text;
    }).join('\n') ?? '';
    

    return {
      title: songName,
      artists: artists,
      lyrics: lyrics,
    };
  }
}

interface MyChordsSearch {
  suggestions: Suggestion[];
}

interface Suggestion {
  value: string;
  data: {
    group: string;
    url: string;
  };
}
