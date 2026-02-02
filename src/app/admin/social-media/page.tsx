'use client'

import { useState } from 'react'
import { Download, Instagram, Facebook } from 'lucide-react'

type TemplateStyle = 'style-1' | 'style-2' | 'style-3' | 'style-4' | 'style-5' | 'style-6' | 'style-7' | 'style-8' | 'style-9' | 'style-10'
type PostType = 'instagram' | 'story'

interface PostContent {
  mainText: string
  subText: string
  productImage?: string
  backgroundColor: string
  textColor: string
  accentColor: string
}

export default function SocialMediaPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateStyle>('style-1')
  const [postType, setPostType] = useState<PostType>('instagram')
  const [showSafeZones, setShowSafeZones] = useState(true)
  const [content, setContent] = useState<PostContent>({
    mainText: 'COMING SOON',
    subText: 'MOSEWEAR.COM',
    productImage: '',
    backgroundColor: '#000000',
    textColor: '#FFFFFF',
    accentColor: '#00A676',
  })

  const templates: Record<TemplateStyle, { name: string; description: string; defaultColors: Pick<PostContent, 'backgroundColor' | 'textColor' | 'accentColor'> }> = {
    'style-1': {
      name: 'Style 1 - Classic',
      description: 'Zwarte achtergrond met MOSE groene accenten',
      defaultColors: {
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
        accentColor: '#00A676',
      },
    },
    'style-2': {
      name: 'Style 2 - Clean',
      description: 'Witte achtergrond met groene accenten',
      defaultColors: {
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        accentColor: '#00A676',
      },
    },
    'style-3': {
      name: 'Style 3 - Bold',
      description: 'Groen als hoofdkleur',
      defaultColors: {
        backgroundColor: '#00A676',
        textColor: '#FFFFFF',
        accentColor: '#000000',
      },
    },
    'style-4': {
      name: 'Style 4 - Minimal',
      description: 'Grijs met subtiele accenten',
      defaultColors: {
        backgroundColor: '#F5F5F5',
        textColor: '#1A1A1A',
        accentColor: '#00A676',
      },
    },
    'style-5': {
      name: 'Style 5 - Dark green',
      description: 'Donkergroen met witte tekst',
      defaultColors: {
        backgroundColor: '#004D3D',
        textColor: '#FFFFFF',
        accentColor: '#00A676',
      },
    },
    'style-6': {
      name: 'Product Split',
      description: 'Product en tekst side-by-side',
      defaultColors: {
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
        accentColor: '#00A676',
      },
    },
    'style-7': {
      name: 'Product Hero',
      description: 'Groot product centraal met floating text',
      defaultColors: {
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        accentColor: '#00A676',
      },
    },
    'style-8': {
      name: 'Product Frame',
      description: 'Product in elegant frame met accenten',
      defaultColors: {
        backgroundColor: '#1A1A1A',
        textColor: '#FFFFFF',
        accentColor: '#00A676',
      },
    },
    'style-9': {
      name: 'Product Overlay',
      description: 'Product met tekst overlay',
      defaultColors: {
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
        accentColor: '#00A676',
      },
    },
    'style-10': {
      name: 'Product Spotlight',
      description: 'Product op kleurblok met schaduw',
      defaultColors: {
        backgroundColor: '#F5F5F5',
        textColor: '#1A1A1A',
        accentColor: '#00A676',
      },
    },
  }

  const handleTemplateChange = (template: TemplateStyle) => {
    setSelectedTemplate(template)
    setContent({
      ...content,
      ...templates[template].defaultColors,
    })
  }

  const handleDownload = () => {
    alert('💡 TIP: Gebruik Cmd+Shift+4 (Mac) of Snipping Tool (Windows) om een screenshot te maken van de preview voor perfecte kwaliteit!')
  }

  // Instagram: 1080x1080, maar grid toont als 4:5 portrait (1080x1350)
  // Dus de linker en rechter 135px worden NIET getoond in grid
  const dimensions = postType === 'instagram' 
    ? { width: 1080, height: 1080 } 
    : { width: 1080, height: 1920 }

  // Safe zone voor Instagram: links en rechts 135px worden afgesneden in portrait grid view
  const safeZone = postType === 'instagram'
    ? { left: 135, right: 135 } // Instagram toont 4:5 portrait crop in grid
    : { left: 0, right: 0 }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Social media content generator</h1>
        <p className="mt-2 text-gray-600">
          Genereer perfecte Instagram en Facebook posts in MOSE style
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Post Type */}
          <div className="bg-white p-6 border-2 border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Post type</h3>
            <div className="space-y-2">
              <button
                onClick={() => setPostType('instagram')}
                className={`w-full flex items-center gap-3 px-4 py-3 border-2 transition-all ${
                  postType === 'instagram'
                    ? 'bg-brand-primary border-brand-primary text-white'
                    : 'border-gray-300 text-gray-700 hover:border-brand-primary'
                }`}
              >
                <Instagram className="w-5 h-5" />
                <span className="font-bold">Instagram post (1:1)</span>
              </button>
              <button
                onClick={() => setPostType('story')}
                className={`w-full flex items-center gap-3 px-4 py-3 border-2 transition-all ${
                  postType === 'story'
                    ? 'bg-brand-primary border-brand-primary text-white'
                    : 'border-gray-300 text-gray-700 hover:border-brand-primary'
                }`}
              >
                <Facebook className="w-5 h-5" />
                <span className="font-bold">Story (9:16)</span>
              </button>
            </div>
          </div>

          {/* Template Selection */}
          <div className="bg-white p-6 border-2 border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">MOSE template style</h3>
            <div className="space-y-2">
              {(Object.keys(templates) as TemplateStyle[]).map((template) => (
                <button
                  key={template}
                  onClick={() => handleTemplateChange(template)}
                  className={`w-full text-left px-4 py-3 border-2 transition-all ${
                    selectedTemplate === template
                      ? 'bg-brand-primary border-brand-primary text-white'
                      : 'border-gray-300 text-gray-700 hover:border-brand-primary'
                  }`}
                >
                  <div className="font-bold">{templates[template].name}</div>
                  <div className={`text-sm mt-1 ${selectedTemplate === template ? 'text-white/80' : 'text-gray-500'}`}>
                    {templates[template].description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Inputs */}
          <div className="bg-white p-6 border-2 border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Content</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Hoofdtekst
                </label>
                <input
                  type="text"
                  value={content.mainText}
                  onChange={(e) => setContent({ ...content, mainText: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                  placeholder="COMING SOON"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Subtekst
                </label>
                <input
                  type="text"
                  value={content.subText}
                  onChange={(e) => setContent({ ...content, subText: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                  placeholder="MOSEWEAR.COM"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Product afbeelding URL
                </label>
                <input
                  type="text"
                  value={content.productImage}
                  onChange={(e) => setContent({ ...content, productImage: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Achtergrondkleur
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={content.backgroundColor}
                    onChange={(e) => setContent({ ...content, backgroundColor: e.target.value })}
                    className="w-16 h-10 border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={content.backgroundColor}
                    onChange={(e) => setContent({ ...content, backgroundColor: e.target.value })}
                    className="flex-1 px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Tekstkleur
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={content.textColor}
                    onChange={(e) => setContent({ ...content, textColor: e.target.value })}
                    className="w-16 h-10 border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={content.textColor}
                    onChange={(e) => setContent({ ...content, textColor: e.target.value })}
                    className="flex-1 px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Accentkleur (MOSE groen aanbevolen)
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={content.accentColor}
                    onChange={(e) => setContent({ ...content, accentColor: e.target.value })}
                    className="w-16 h-10 border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={content.accentColor}
                    onChange={(e) => setContent({ ...content, accentColor: e.target.value })}
                    className="flex-1 px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-brand-primary text-white font-bold border-2 border-brand-primary hover:bg-black hover:border-black transition-all"
          >
            <Download className="w-5 h-5" />
            Screenshot instructies
          </button>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Preview</h3>
              <div className="flex items-center gap-4">
                {postType === 'instagram' && (
                  <button
                    onClick={() => setShowSafeZones(!showSafeZones)}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide border-2 transition-all ${
                      showSafeZones
                        ? 'bg-orange-500 border-orange-500 text-white hover:bg-orange-600'
                        : 'border-gray-300 text-gray-700 hover:border-orange-500'
                    }`}
                    title="Toggle safe zone indicators"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showSafeZones ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      )}
                    </svg>
                    <span className="hidden md:inline">{showSafeZones ? 'Verberg' : 'Toon'} Safe Zones</span>
                    <span className="md:hidden">{showSafeZones ? 'Verberg' : 'Toon'}</span>
                  </button>
                )}
                <div className="text-sm text-gray-500">
                  {dimensions.width} × {dimensions.height}px
                  {postType === 'instagram' && showSafeZones && (
                    <span className="ml-2 text-orange-600 font-bold">
                      (Safe zone: {safeZone.left}px links/rechts)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Preview Container */}
            <div className="flex justify-center bg-gray-100 p-8">
              <div
                id="social-preview"
                style={{
                  width: postType === 'instagram' ? '540px' : '324px',
                  height: postType === 'instagram' ? '540px' : '576px',
                  backgroundColor: content.backgroundColor,
                  position: 'relative',
                  overflow: 'hidden',
                }}
                className="shadow-2xl"
              >
                {/* Safe Zone Indicators (Instagram only) - LINKS EN RECHTS! */}
                {postType === 'instagram' && showSafeZones && (
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        width: `${(safeZone.left / dimensions.width) * 100}%`,
                        backgroundColor: 'rgba(255, 0, 0, 0.15)',
                        borderRight: '2px dashed red',
                        zIndex: 1000,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        right: 0,
                        width: `${(safeZone.right / dimensions.width) * 100}%`,
                        backgroundColor: 'rgba(255, 0, 0, 0.15)',
                        borderLeft: '2px dashed red',
                        zIndex: 1000,
                      }}
                    />
                  </>
                )}

                {/* Template Rendering - All use unified MOSE styling */}
                <UnifiedMoseTemplate 
                  content={content} 
                  postType={postType} 
                  variant={selectedTemplate}
                />
              </div>
            </div>

            {/* Instructions */}
            {showSafeZones && postType === 'instagram' && (
              <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 text-sm">
                <p className="font-bold text-blue-900 mb-2">💡 Tip voor Instagram grid:</p>
                <p className="text-blue-800 mb-2">
                  De rode zones links en rechts worden afgesneden in de Instagram grid weergave (portrait 4:5).
                  Plaats belangrijke content zoals logo en tekst in het midden (groene zone)!
                </p>
                <p className="text-blue-900 font-bold mt-3 mb-1">📸 Screenshot maken:</p>
                <ul className="text-blue-800 list-disc list-inside space-y-1">
                  <li><strong>Mac:</strong> Cmd + Shift + 4, selecteer het preview vierkant</li>
                  <li><strong>Windows:</strong> Gebruik Snipping Tool of Win + Shift + S</li>
                  <li>Voor beste kwaliteit: screenshot alleen het preview vierkant (niet de hele pagina)</li>
                </ul>
                <p className="text-blue-900 font-bold mt-3">
                  💡 <strong>Tip:</strong> Klik op "Verberg Safe Zones" voor een schone screenshot zonder rode guides!
                </p>
              </div>
            )}
            
            {!showSafeZones && postType === 'instagram' && (
              <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 text-sm">
                <p className="font-bold text-green-900 mb-2">📸 Ready voor screenshot!</p>
                <p className="text-green-800">
                  Safe zones zijn verborgen. Maak nu je screenshot voor een perfect schone Instagram post!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Unified MOSE Template - Alle 10 varianten gebruiken dezelfde design language
function UnifiedMoseTemplate({ 
  content, 
  postType, 
  variant 
}: { 
  content: PostContent
  postType: PostType
  variant: TemplateStyle 
}) {
  const isStory = postType === 'story'
  const isDarkBg = ['#000000', '#000', '#004D3D', '#1A1A1A'].includes(content.backgroundColor) || 
                   parseInt(content.backgroundColor.replace('#', ''), 16) < 0x808080

  // Product-focused templates (6-10) hebben speciale layouts
  const isProductFocused = ['style-6', 'style-7', 'style-8', 'style-9', 'style-10'].includes(variant)

  // Voor product-focused templates: toon instructie als geen afbeelding
  if (isProductFocused && !content.productImage) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '40px',
        fontFamily: 'Montserrat, Arial, sans-serif',
      }}>
        <div style={{ 
          textAlign: 'center',
          color: content.textColor,
          opacity: 0.6,
        }}>
          <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
            Product afbeelding vereist
          </p>
          <p style={{ fontSize: '14px' }}>
            Voeg een product URL toe voor deze template
          </p>
        </div>
      </div>
    )
  }

  // STYLE 6: Product Split
  if (variant === 'style-6') {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'grid',
        gridTemplateColumns: isStory ? '1fr' : '1fr 1fr',
        fontFamily: 'Montserrat, Arial, sans-serif',
      }}>
        {/* Product Side */}
        <div style={{ 
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        }}>
          <img
            src={content.productImage}
            alt="Product"
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>

        {/* Text Side */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isStory ? '60px 40px' : '40px',
          position: 'relative',
        }}>
          <img
            src="/logomose.png"
            alt="MOSE"
            style={{ 
              height: '35px',
              width: 'auto',
              filter: isDarkBg ? 'brightness(0) invert(1)' : 'none',
              marginBottom: '40px',
              opacity: 0.95,
            }}
          />

          <h1 style={{ 
            fontSize: isStory ? '42px' : '48px',
            fontWeight: 400,
            color: content.textColor,
            textAlign: 'center',
            marginBottom: '20px',
            fontFamily: 'Anton, Arial Black, sans-serif',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            lineHeight: '1.1',
          }}>
            {content.mainText}
          </h1>

          <div style={{ 
            width: '60px',
            height: '3px',
            backgroundColor: content.accentColor,
            marginBottom: '20px',
          }} />

          <p style={{ 
            fontSize: isStory ? '16px' : '18px',
            color: content.textColor,
            textAlign: 'center',
            fontFamily: 'Montserrat, Arial, sans-serif',
            letterSpacing: '4px',
            fontWeight: 600,
            opacity: 0.9,
            textTransform: 'uppercase',
          }}>
            {content.subText}
          </p>
        </div>
      </div>
    )
  }

  // STYLE 7: Product Hero
  if (variant === 'style-7') {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Montserrat, Arial, sans-serif',
      }}>
        {/* Large Product */}
        <div style={{ 
          position: 'absolute',
          inset: isStory ? '100px 60px' : '80px 60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img
            src={content.productImage}
            alt="Product"
            style={{ 
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))',
            }}
          />
        </div>

        {/* Floating Logo Top */}
        <div style={{ 
          position: 'absolute',
          top: isStory ? '60px' : '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
        }}>
          <img
            src="/logomose.png"
            alt="MOSE"
            style={{ 
              height: isStory ? '40px' : '35px',
              width: 'auto',
              filter: isDarkBg ? 'brightness(0) invert(1)' : 'none',
              opacity: 0.95,
            }}
          />
        </div>

        {/* Floating Text Bottom */}
        <div style={{ 
          position: 'absolute',
          bottom: isStory ? '60px' : '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          width: '90%',
          zIndex: 10,
        }}>
          <h1 style={{ 
            fontSize: isStory ? '40px' : '44px',
            fontWeight: 400,
            color: content.textColor,
            marginBottom: '16px',
            fontFamily: 'Anton, Arial Black, sans-serif',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            textShadow: isDarkBg ? 'none' : '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            {content.mainText}
          </h1>

          <div style={{ 
            width: '60px',
            height: '3px',
            backgroundColor: content.accentColor,
            margin: '0 auto 16px',
          }} />

          <p style={{ 
            fontSize: isStory ? '15px' : '16px',
            color: content.textColor,
            fontFamily: 'Montserrat, Arial, sans-serif',
            letterSpacing: '4px',
            fontWeight: 600,
            opacity: 0.9,
            textTransform: 'uppercase',
          }}>
            {content.subText}
          </p>
        </div>
      </div>
    )
  }

  // STYLE 8: Product Frame
  if (variant === 'style-8') {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isStory ? '80px 50px' : '60px 50px',
        fontFamily: 'Montserrat, Arial, sans-serif',
      }}>
        {/* Logo Top */}
        <div style={{ 
          position: 'absolute',
          top: isStory ? '60px' : '50px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}>
          <img
            src="/logomose.png"
            alt="MOSE"
            style={{ 
              height: '35px',
              width: 'auto',
              filter: isDarkBg ? 'brightness(0) invert(1)' : 'none',
              opacity: 0.95,
            }}
          />
        </div>

        {/* Product with Frame */}
        <div style={{ 
          border: `4px solid ${content.accentColor}`,
          padding: '20px',
          marginBottom: '40px',
          backgroundColor: isDarkBg ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          position: 'relative',
        }}>
          {/* Corner Accents */}
          <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '20px', height: '20px', borderTop: `2px solid ${content.accentColor}`, borderLeft: `2px solid ${content.accentColor}` }} />
          <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '20px', height: '20px', borderTop: `2px solid ${content.accentColor}`, borderRight: `2px solid ${content.accentColor}` }} />
          <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '20px', height: '20px', borderBottom: `2px solid ${content.accentColor}`, borderLeft: `2px solid ${content.accentColor}` }} />
          <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '20px', height: '20px', borderBottom: `2px solid ${content.accentColor}`, borderRight: `2px solid ${content.accentColor}` }} />
          
          <img
            src={content.productImage}
            alt="Product"
            style={{ 
              width: isStory ? '200px' : '220px',
              height: isStory ? '200px' : '220px',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>

        {/* Text */}
        <h1 style={{ 
          fontSize: isStory ? '38px' : '42px',
          fontWeight: 400,
          color: content.textColor,
          textAlign: 'center',
          marginBottom: '16px',
          fontFamily: 'Anton, Arial Black, sans-serif',
          letterSpacing: '2px',
          textTransform: 'uppercase',
        }}>
          {content.mainText}
        </h1>

        <div style={{ 
          width: '60px',
          height: '3px',
          backgroundColor: content.accentColor,
          marginBottom: '16px',
        }} />

        <p style={{ 
          fontSize: isStory ? '15px' : '16px',
          color: content.textColor,
          textAlign: 'center',
          fontFamily: 'Montserrat, Arial, sans-serif',
          letterSpacing: '4px',
          fontWeight: 600,
          opacity: 0.9,
          textTransform: 'uppercase',
        }}>
          {content.subText}
        </p>
      </div>
    )
  }

  // STYLE 9: Product Overlay
  if (variant === 'style-9') {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        fontFamily: 'Montserrat, Arial, sans-serif',
      }}>
        {/* Product Background */}
        <div style={{ 
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
        }}>
          <img
            src={content.productImage}
            alt="Product"
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'brightness(0.7)',
            }}
          />
        </div>

        {/* Dark Gradient Overlay */}
        <div style={{ 
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${content.backgroundColor}E6 0%, ${content.backgroundColor}99 100%)`,
        }} />

        {/* Content */}
        <div style={{ 
          position: 'relative',
          zIndex: 10,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isStory ? '80px 40px' : '60px 40px',
        }}>
          <img
            src="/logomose.png"
            alt="MOSE"
            style={{ 
              height: isStory ? '45px' : '40px',
              width: 'auto',
              filter: 'brightness(0) invert(1)',
              marginBottom: '50px',
              opacity: 0.95,
            }}
          />

          <h1 style={{ 
            fontSize: isStory ? '48px' : '56px',
            fontWeight: 400,
            color: '#FFFFFF',
            textAlign: 'center',
            marginBottom: '20px',
            fontFamily: 'Anton, Arial Black, sans-serif',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}>
            {content.mainText}
          </h1>

          <div style={{ 
            width: '80px',
            height: '3px',
            backgroundColor: content.accentColor,
            marginBottom: '20px',
          }} />

          <p style={{ 
            fontSize: isStory ? '17px' : '18px',
            color: '#FFFFFF',
            textAlign: 'center',
            fontFamily: 'Montserrat, Arial, sans-serif',
            letterSpacing: '5px',
            fontWeight: 600,
            textTransform: 'uppercase',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          }}>
            {content.subText}
          </p>
        </div>
      </div>
    )
  }

  // STYLE 10: Product Spotlight
  if (variant === 'style-10') {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isStory ? '80px 40px' : '60px 40px',
        fontFamily: 'Montserrat, Arial, sans-serif',
      }}>
        {/* Logo Top */}
        <div style={{ 
          position: 'absolute',
          top: isStory ? '60px' : '50px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}>
          <img
            src="/logomose.png"
            alt="MOSE"
            style={{ 
              height: '35px',
              width: 'auto',
              filter: isDarkBg ? 'brightness(0) invert(1)' : 'none',
              opacity: 0.95,
            }}
          />
        </div>

        {/* Product on Color Block */}
        <div style={{ 
          backgroundColor: content.accentColor,
          padding: isStory ? '40px' : '35px',
          marginBottom: '40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          position: 'relative',
        }}>
          <img
            src={content.productImage}
            alt="Product"
            style={{ 
              width: isStory ? '220px' : '240px',
              height: isStory ? '220px' : '240px',
              objectFit: 'contain',
              display: 'block',
              filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))',
            }}
          />
          
          {/* Accent corners */}
          <div style={{ position: 'absolute', top: '-8px', left: '-8px', width: '25px', height: '25px', border: `3px solid ${content.accentColor}` }} />
          <div style={{ position: 'absolute', bottom: '-8px', right: '-8px', width: '25px', height: '25px', border: `3px solid ${content.accentColor}` }} />
        </div>

        {/* Text */}
        <h1 style={{ 
          fontSize: isStory ? '42px' : '48px',
          fontWeight: 400,
          color: content.textColor,
          textAlign: 'center',
          marginBottom: '18px',
          fontFamily: 'Anton, Arial Black, sans-serif',
          letterSpacing: '3px',
          textTransform: 'uppercase',
        }}>
          {content.mainText}
        </h1>

        <div style={{ 
          width: '70px',
          height: '3px',
          backgroundColor: content.accentColor,
          marginBottom: '18px',
        }} />

        <p style={{ 
          fontSize: isStory ? '16px' : '18px',
          color: content.textColor,
          textAlign: 'center',
          fontFamily: 'Montserrat, Arial, sans-serif',
          letterSpacing: '5px',
          fontWeight: 600,
          opacity: 0.9,
          textTransform: 'uppercase',
        }}>
          {content.subText}
        </p>
      </div>
    )
  }

  // STYLES 1-5: Original templates (existing code)
  // Consistent layout structure voor alle varianten
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      position: 'relative', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: isStory ? '80px 40px' : '60px 40px',
      fontFamily: 'Montserrat, Arial, sans-serif',
    }}>
      {/* Logo - Altijd bovenaan, gecentreerd */}
      <div style={{ 
        position: 'absolute', 
        top: isStory ? '80px' : '60px', 
        left: '50%', 
        transform: 'translateX(-50%)',
        zIndex: 10,
      }}>
        <img
          src="/logomose.png"
          alt="MOSE"
          style={{ 
            height: isStory ? '45px' : '40px',
            width: 'auto', 
            filter: isDarkBg ? 'brightness(0) invert(1)' : 'none',
            opacity: 0.95,
          }}
        />
      </div>

      {/* Product Image - Als aanwezig */}
      {content.productImage && (
        <div style={{ 
          marginBottom: isStory ? '50px' : '40px',
          maxWidth: isStory ? '60%' : '55%',
          maxHeight: isStory ? '40%' : '35%',
        }}>
          <img
            src={content.productImage}
            alt="Product"
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: variant === 'style-3' ? 'brightness(1.1)' : 'none',
            }}
          />
        </div>
      )}

      {/* Main Text - Anton font (MOSE display font) */}
      <h1 style={{ 
        fontSize: isStory ? '56px' : '64px',
        fontWeight: 400,
        color: content.textColor,
        textAlign: 'center',
        marginBottom: isStory ? '24px' : '20px',
        fontFamily: 'Anton, Arial Black, sans-serif',
        letterSpacing: '3px',
        textTransform: 'uppercase',
        lineHeight: '1.1',
        zIndex: 5,
      }}>
        {content.mainText}
      </h1>

      {/* Accent Line - MOSE signature element */}
      <div style={{ 
        width: '80px',
        height: '3px',
        backgroundColor: content.accentColor,
        marginBottom: isStory ? '24px' : '20px',
        zIndex: 5,
      }} />

      {/* Sub Text - Montserrat (MOSE body font) */}
      <p style={{ 
        fontSize: isStory ? '18px' : '20px',
        color: content.textColor,
        textAlign: 'center',
        fontFamily: 'Montserrat, Arial, sans-serif',
        letterSpacing: '5px',
        fontWeight: 600,
        opacity: 0.9,
        textTransform: 'uppercase',
        zIndex: 5,
      }}>
        {content.subText}
      </p>

      {/* Variant-specific decorative elements */}
      {variant === 'style-1' && (
        <>
          <div style={{ position: 'absolute', top: '40px', left: '40px', width: '30px', height: '30px', border: `2px solid ${content.accentColor}`, opacity: 0.3 }} />
          <div style={{ position: 'absolute', bottom: '40px', right: '40px', width: '30px', height: '30px', border: `2px solid ${content.accentColor}`, opacity: 0.3 }} />
        </>
      )}

      {variant === 'style-2' && (
        <div style={{ position: 'absolute', inset: '30px', border: `1px solid ${content.textColor}`, opacity: 0.1, pointerEvents: 'none' }} />
      )}

      {variant === 'style-3' && (
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: `linear-gradient(135deg, ${content.backgroundColor} 0%, rgba(0,0,0,0.3) 100%)`,
          zIndex: 1,
        }} />
      )}

      {variant === 'style-4' && (
        <>
          <div style={{ position: 'absolute', top: '30px', left: '30px', right: '30px', height: '1px', backgroundColor: content.accentColor, opacity: 0.2 }} />
          <div style={{ position: 'absolute', bottom: '30px', left: '30px', right: '30px', height: '1px', backgroundColor: content.accentColor, opacity: 0.2 }} />
        </>
      )}

      {variant === 'style-5' && (
        <div style={{ 
          position: 'absolute', 
          inset: '25px', 
          border: `2px solid ${content.accentColor}`, 
          opacity: 0.2,
          pointerEvents: 'none',
        }} />
      )}
    </div>
  )
}
