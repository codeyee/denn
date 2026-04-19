"""Demon Slayer Season 1, TMDB id 85937:1 — normalized proxy payload (with all 26 episodes)."""

_EPISODE_TITLES = [
    'Cruelty',
    'Trainer Sakonji Urokodaki',
    'Sabito and Makomo',
    'Final Selection',
    'My Own Steel',
    'Swordsman Accompanying a Demon',
    'Muzan Kibutsuji',
    "The Smell of Enchanting Blood",
    'Temari Demon and Arrow Demon',
    'Together Forever',
    'Tsuzumi Mansion',
    'The Boar Bares Its Fangs, Zenitsu Sleeps',
    'Something More Important Than Life',
    'The House with the Wisteria Family Crest',
    'Mount Natagumo',
    'Letting Someone Else Go First',
    'You Must Master a Single Thing',
    'A Forged Bond',
    'Hinokami',
    "Pretend Family",
    "Against Corps Rules",
    'Master of the Mansion',
    'Hashira Meeting',
    'Rehabilitation Training',
    "Tsuguko, Kanao Tsuyuri",
    'New Mission',
]

PAYLOAD = {
    'id': '116882',
    'type': 'season',
    'season_number': 1,
    'title': 'Demon Slayer: Kimetsu no Yaiba',
    'tv_show_name': 'Demon Slayer: Kimetsu no Yaiba',
    'description': 'The first season of the supernatural demon-hunting anime.',
    'image_url': 'https://image.tmdb.org/t/p/original/yWeAa42QC4xfXmjBl9nXiUowcSZ.jpg',
    'release_date': '2019-04-06',
    'number_of_episodes': len(_EPISODE_TITLES),
    'images': [
        {'type': 'poster', 'size': 'standard', 'image_url': 'https://image.tmdb.org/t/p/w500/yWeAa42QC4xfXmjBl9nXiUowcSZ.jpg'},
    ],
    'platforms': {
        'stream': [
            {'name': 'Crunchyroll', 'image_url': 'https://image.tmdb.org/t/p/original/crunchyroll.jpg'},
        ],
    },
    'episodes': [
        {
            'id': f'85937:1:{i}',
            'episode_number': i,
            'season_number': 1,
            'title': title,
            'description': '',
            'release_date': '2019-04-06',
            'duration_minutes': 23,
            'image_url': f'https://image.tmdb.org/t/p/w500/episodes/85937-1-{i}.jpg',
            'episode_type': 'standard',
        }
        for i, title in enumerate(_EPISODE_TITLES, start=1)
    ],
}
