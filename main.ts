import { App, PluginSettingTab, Setting, Plugin, MarkdownView, Notice } from 'obsidian';

// 동적으로 CSS 스타일 추가 함수
function addDynamicStyle(className: string, rgbColor: { r: number; g: number; b: number; }) {
    const style = document.createElement('style');
    style.innerHTML = `
        .${className} {
            color: rgb(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}) !important;
        }
    `;
    document.head.appendChild(style);
}

// 단어와 색상에 대한 기본 설정
interface WordColor {
    word: string;
    rgb: { r: number; g: number; b: number };
}

interface MyPluginSettings {
    wordColors: WordColor[];
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    wordColors: [
        { word: '한글', rgb: { r: 255, g: 100, b: 100 } },  // 기본값: 빨간색 한글
        { word: 'test', rgb: { r: 100, g: 255, b: 100 } },  // 기본값: 녹색 test
        { word: 'sample', rgb: { r: 100, g: 100, b: 255 } } // 기본값: 파란색 sample
    ]
};

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;

    async onload() {
        await this.loadSettings();

        // 색상 적용 리본 아이콘 추가
        const ribbonIconEl = this.addRibbonIcon('dice', 'Color Change', () => {
            this.removeHighlights();  // 먼저 기존 하이라이트를 제거한 후
            this.applyColorChange();  // 새로운 색상 적용
        });
        ribbonIconEl.addClass('my-plugin-ribbon-class');

        // 하이라이트 제거 리본 아이콘 복구
        const removeIconEl = this.addRibbonIcon('cross', 'Remove Highlights', () => {
            this.removeHighlights(); // 기존 하이라이트 제거 함수
        });
        removeIconEl.addClass('my-plugin-ribbon-class');  // 리본 아이콘 스타일 추가

        // 설정 탭 추가
        this.addSettingTab(new WordColorSettingTab(this.app, this));
    }

    // 단어와 색상 설정을 불러와 적용하는 함수
    applyColorChange() {
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);

        if (markdownView) {
            const editor = markdownView.editor;

            if (editor) {
                let doc = editor.getValue();

                // 설정된 단어와 색상 정보 사용
                this.settings.wordColors.forEach((entry, index) => {
                    const className = `highlight-${index}`;
                    addDynamicStyle(className, entry.rgb);

                    // 이미 하이라이트가 적용된 단어는 제외하는 정규식
                    const regex = new RegExp(`(?!<span class="${className}">)(${entry.word})(?!<\/span>)`, 'g');

                    // 중복 방지: 이미 하이라이트된 단어는 건너뛰고, 나머지만 태그로 감쌉니다.
                    doc = doc.replace(regex, `<span class="${className}">$1</span>`);
                });

                editor.setValue(doc);
                new Notice("단어 감지 및 색상 적용 완료!");
            } else {
                new Notice("에디터 객체를 찾을 수 없습니다.");
            }
        } else {
            new Notice("활성화된 마크다운 뷰를 찾을 수 없습니다.");
        }
    }

    // HTML 태그 제거 함수 (기존 하이라이트된 태그 제거)
    removeHighlights() {
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);

        if (markdownView) {
            const editor = markdownView.editor;

            if (editor) {
                let doc = editor.getValue();

                // 모든 <span class="highlight-*"> 태그를 제거하고 원래 텍스트로 복원
                doc = doc.replace(/<span class="highlight-\d+">([^<]+)<\/span>/g, '$1');

                editor.setValue(doc);
                new Notice("기존 하이라이트 제거 완료!");
            } else {
                new Notice("에디터 객체를 찾을 수 없습니다.");
            }
        } else {
            new Notice("활성화된 마크다운 뷰를 찾을 수 없습니다.");
    }
    }

    onunload() {
        // 플러그인이 비활성화될 때 실행할 코드
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

// 플러그인의 설정 탭을 관리하는 클래스
class WordColorSettingTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Word Color Settings' });

        // 각 단어와 색상 설정을 위한 UI 추가
        this.plugin.settings.wordColors.forEach((wordColor, index) => {
            // 구분선을 추가하여 각 단어 설정을 구분
            if (index > 0) {
                containerEl.createEl('hr'); // 각 단어를 구분하는 구분선을 추가
            }

            const div = containerEl.createDiv();

            // 단어 입력 필드
            new Setting(div)
                .setName(`Word #${index + 1}`)
                .setDesc('Enter the word you want to highlight')
                .addText(text => text
                    .setValue(wordColor.word)
                    .onChange(async (value) => {
                        this.plugin.settings.wordColors[index].word = value;
                        await this.plugin.saveSettings();
                    }));

            // 컬러 픽커 및 RGB 입력 필드
            const rgbToHex = (r: number, g: number, b: number) => `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
            const hexToRgb = (hex: string) => {
                const bigint = parseInt(hex.slice(1), 16);
                return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
            };

            const updateColorFields = (rgb: { r: number; g: number; b: number }) => {
                rgbRInput.setValue(rgb.r.toString());
                rgbGInput.setValue(rgb.g.toString());
                rgbBInput.setValue(rgb.b.toString());
            };

            // 컬러 픽커 버튼
            const colorPicker = new Setting(div)
                .setName('Color Picker')
                .setDesc('Choose a color or enter RGB values manually')
                .addColorPicker(colorPicker => colorPicker
                    .setValue(rgbToHex(wordColor.rgb.r, wordColor.rgb.g, wordColor.rgb.b))
                    .onChange(async (value) => {
                        const rgb = hexToRgb(value);
                        this.plugin.settings.wordColors[index].rgb = rgb;
                        await this.plugin.saveSettings();
                        updateColorFields(rgb); // RGB 필드를 컬러 픽커 값으로 업데이트
                    }));

            // RGB 값 입력 필드 한 줄로 추가
            const rgbSetting = new Setting(div)
                .setName('RGB Input')
                .setDesc('Enter R G B values');

            const rgbRInput = rgbSetting.addText(text => text
                .setPlaceholder('R')
                .setValue(wordColor.rgb.r.toString())
                .onChange(async (value) => {
                    const r = parseInt(value) || 0;
                    this.plugin.settings.wordColors[index].rgb.r = r;
                    await this.plugin.saveSettings();
                    colorPicker.setValue(rgbToHex(r, this.plugin.settings.wordColors[index].rgb.g, this.plugin.settings.wordColors[index].rgb.b));
                }));

            const rgbGInput = rgbSetting.addText(text => text
                .setPlaceholder('G')
                .setValue(wordColor.rgb.g.toString())
                .onChange(async (value) => {
                    const g = parseInt(value) || 0;
                    this.plugin.settings.wordColors[index].rgb.g = g;
                    await this.plugin.saveSettings();
                    colorPicker.setValue(rgbToHex(this.plugin.settings.wordColors[index].rgb.r, g, this.plugin.settings.wordColors[index].rgb.b));
                }));

            const rgbBInput = rgbSetting.addText(text => text
                .setPlaceholder('B')
                .setValue(wordColor.rgb.b.toString())
                .onChange(async (value) => {
                    const b = parseInt(value) || 0;
                    this.plugin.settings.wordColors[index].rgb.b = b;
                    await this.plugin.saveSettings();
                    colorPicker.setValue(rgbToHex(this.plugin.settings.wordColors[index].rgb.r, this.plugin.settings.wordColors[index].rgb.g, b));
                }));

            // 단어 제거 버튼 추가
            new Setting(div)
                .addButton(button => {
                    button
                        .setButtonText('Remove')
                        .setWarning()  // 빨간색으로 강조
                        .onClick(async () => {
                            // 설정에서 해당 단어 제거
                            this.plugin.settings.wordColors.splice(index, 1);
                            await this.plugin.saveSettings();
                            this.display();  // 화면 다시 렌더링
                        });
                });
        });

        // 새로운 단어 추가 버튼
        containerEl.createEl('hr'); // 구분선을 추가하여 새로운 단어 추가 버튼을 분리
        const addButton = containerEl.createEl('button', { text: 'Add new word' });
        addButton.onclick = async () => {
            this.plugin.settings.wordColors.push({ word: 'new word', rgb: { r: 255, g: 255, b: 255 } });
            await this.plugin.saveSettings();
            this.display(); // 다시 그리기
        };
    }
}
