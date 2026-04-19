export function ListSidebarPlaceholder() {
  return (
    <div className="w-full md:w-80 lg:w-96 shrink-0 space-y-6 order-1 md:order-2 md:sticky md:top-24 md:self-start md:max-h-[calc(100vh-8rem)] md:overflow-y-auto">
      {/* List Actions Card */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <div className="h-6 bg-white/15 rounded w-32 mb-4 relative overflow-hidden">
          <div
            className="absolute inset-0 animate-glare pointer-events-none"
            style={{
              background: `linear-gradient(-45deg,
                transparent 40%,
                var(--color-glare) 45%,
                var(--color-glare) 55%,
                transparent 60%)`,
              backgroundSize: "200% 200%",
              backgroundRepeat: "no-repeat",
            }}
          />
        </div>
        <div className="space-y-3">
          <div className="h-11 bg-white/10 rounded-lg relative overflow-hidden">
            <div
              className="absolute inset-0 animate-glare pointer-events-none"
              style={{
                background: `linear-gradient(-45deg,
                  transparent 40%,
                  var(--color-glare) 45%,
                  var(--color-glare) 55%,
                  transparent 60%)`,
                backgroundSize: "200% 200%",
                backgroundRepeat: "no-repeat",
              }}
            />
          </div>
          <div className="h-11 bg-white/10 rounded-lg relative overflow-hidden">
            <div
              className="absolute inset-0 animate-glare pointer-events-none"
              style={{
                background: `linear-gradient(-45deg,
                  transparent 40%,
                  var(--color-glare) 45%,
                  var(--color-glare) 55%,
                  transparent 60%)`,
                backgroundSize: "200% 200%",
                backgroundRepeat: "no-repeat",
              }}
            />
          </div>
          <div className="h-11 bg-white/10 rounded-lg relative overflow-hidden">
            <div
              className="absolute inset-0 animate-glare pointer-events-none"
              style={{
                background: `linear-gradient(-45deg,
                  transparent 40%,
                  var(--color-glare) 45%,
                  var(--color-glare) 55%,
                  transparent 60%)`,
                backgroundSize: "200% 200%",
                backgroundRepeat: "no-repeat",
              }}
            />
          </div>
        </div>
      </div>

      {/* List Stats Card */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <div className="h-6 bg-white/15 rounded w-20 mb-4 relative overflow-hidden">
          <div
            className="absolute inset-0 animate-glare pointer-events-none"
            style={{
              background: `linear-gradient(-45deg,
                transparent 40%,
                var(--color-glare) 45%,
                var(--color-glare) 55%,
                transparent 60%)`,
              backgroundSize: "200% 200%",
              backgroundRepeat: "no-repeat",
            }}
          />
        </div>
        <div className="space-y-4">
          {/* Total Items */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white/10 rounded relative overflow-hidden">
                <div
                  className="absolute inset-0 animate-glare pointer-events-none"
                  style={{
                    background: `linear-gradient(-45deg,
                      transparent 40%,
                      var(--color-glare) 45%,
                      var(--color-glare) 55%,
                      transparent 60%)`,
                    backgroundSize: "200% 200%",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </div>
              <div className="h-4 bg-white/10 rounded w-24 relative overflow-hidden">
                <div
                  className="absolute inset-0 animate-glare pointer-events-none"
                  style={{
                    background: `linear-gradient(-45deg,
                      transparent 40%,
                      var(--color-glare) 45%,
                      var(--color-glare) 55%,
                      transparent 60%)`,
                    backgroundSize: "200% 200%",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </div>
            </div>
            <div className="h-6 bg-white/15 rounded w-12 relative overflow-hidden">
              <div
                className="absolute inset-0 animate-glare pointer-events-none"
                style={{
                  background: `linear-gradient(-45deg,
                    transparent 40%,
                    var(--color-glare) 45%,
                    var(--color-glare) 55%,
                    transparent 60%)`,
                  backgroundSize: "200% 200%",
                  backgroundRepeat: "no-repeat",
                }}
              />
            </div>
          </div>

          {/* Completed */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white/10 rounded relative overflow-hidden">
                <div
                  className="absolute inset-0 animate-glare pointer-events-none"
                  style={{
                    background: `linear-gradient(-45deg,
                      transparent 40%,
                      var(--color-glare) 45%,
                      var(--color-glare) 55%,
                      transparent 60%)`,
                    backgroundSize: "200% 200%",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </div>
              <div className="h-4 bg-white/10 rounded w-24 relative overflow-hidden">
                <div
                  className="absolute inset-0 animate-glare pointer-events-none"
                  style={{
                    background: `linear-gradient(-45deg,
                      transparent 40%,
                      var(--color-glare) 45%,
                      var(--color-glare) 55%,
                      transparent 60%)`,
                    backgroundSize: "200% 200%",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </div>
            </div>
            <div className="h-6 bg-white/15 rounded w-12 relative overflow-hidden">
              <div
                className="absolute inset-0 animate-glare pointer-events-none"
                style={{
                  background: `linear-gradient(-45deg,
                    transparent 40%,
                    var(--color-glare) 45%,
                    var(--color-glare) 55%,
                    transparent 60%)`,
                  backgroundSize: "200% 200%",
                  backgroundRepeat: "no-repeat",
                }}
              />
            </div>
          </div>

          {/* Pending */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white/10 rounded relative overflow-hidden">
                <div
                  className="absolute inset-0 animate-glare pointer-events-none"
                  style={{
                    background: `linear-gradient(-45deg,
                      transparent 40%,
                      var(--color-glare) 45%,
                      var(--color-glare) 55%,
                      transparent 60%)`,
                    backgroundSize: "200% 200%",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </div>
              <div className="h-4 bg-white/10 rounded w-24 relative overflow-hidden">
                <div
                  className="absolute inset-0 animate-glare pointer-events-none"
                  style={{
                    background: `linear-gradient(-45deg,
                      transparent 40%,
                      var(--color-glare) 45%,
                      var(--color-glare) 55%,
                      transparent 60%)`,
                    backgroundSize: "200% 200%",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </div>
            </div>
            <div className="h-6 bg-white/15 rounded w-12 relative overflow-hidden">
              <div
                className="absolute inset-0 animate-glare pointer-events-none"
                style={{
                  background: `linear-gradient(-45deg,
                    transparent 40%,
                    var(--color-glare) 45%,
                    var(--color-glare) 55%,
                    transparent 60%)`,
                  backgroundSize: "200% 200%",
                  backgroundRepeat: "no-repeat",
                }}
              />
            </div>
          </div>

          {/* Completion Rate */}
          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="h-4 bg-white/10 rounded w-32 relative overflow-hidden">
                <div
                  className="absolute inset-0 animate-glare pointer-events-none"
                  style={{
                    background: `linear-gradient(-45deg,
                      transparent 40%,
                      var(--color-glare) 45%,
                      var(--color-glare) 55%,
                      transparent 60%)`,
                    backgroundSize: "200% 200%",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </div>
              <div className="h-4 bg-white/15 rounded w-12 relative overflow-hidden">
                <div
                  className="absolute inset-0 animate-glare pointer-events-none"
                  style={{
                    background: `linear-gradient(-45deg,
                      transparent 40%,
                      var(--color-glare) 45%,
                      var(--color-glare) 55%,
                      transparent 60%)`,
                    backgroundSize: "200% 200%",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </div>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 relative overflow-hidden">
              <div
                className="absolute inset-0 animate-glare pointer-events-none"
                style={{
                  background: `linear-gradient(-45deg,
                    transparent 40%,
                    var(--color-glare) 45%,
                    var(--color-glare) 55%,
                    transparent 60%)`,
                  backgroundSize: "200% 200%",
                  backgroundRepeat: "no-repeat",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* List Controls Card */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <div className="h-6 bg-white/15 rounded w-32 mb-4 relative overflow-hidden">
          <div
            className="absolute inset-0 animate-glare pointer-events-none"
            style={{
              background: `linear-gradient(-45deg,
                transparent 40%,
                var(--color-glare) 45%,
                var(--color-glare) 55%,
                transparent 60%)`,
              backgroundSize: "200% 200%",
              backgroundRepeat: "no-repeat",
            }}
          />
        </div>
        <div className="space-y-4">
          {/* Grouping Section */}
          <div className="space-y-2">
            <div className="h-4 bg-white/10 rounded w-20 mb-2 relative overflow-hidden">
              <div
                className="absolute inset-0 animate-glare pointer-events-none"
                style={{
                  background: `linear-gradient(-45deg,
                    transparent 40%,
                    var(--color-glare) 45%,
                    var(--color-glare) 55%,
                    transparent 60%)`,
                  backgroundSize: "200% 200%",
                  backgroundRepeat: "no-repeat",
                }}
              />
            </div>
            <div className="space-y-2">
              <div>
                <div className="h-3 bg-white/10 rounded w-16 mb-1 relative overflow-hidden">
                  <div
                    className="absolute inset-0 animate-glare pointer-events-none"
                    style={{
                      background: `linear-gradient(-45deg,
                        transparent 40%,
                        var(--color-glare) 45%,
                        var(--color-glare) 55%,
                        transparent 60%)`,
                      backgroundSize: "200% 200%",
                      backgroundRepeat: "no-repeat",
                    }}
                  />
                </div>
                <div className="h-10 bg-white/10 rounded relative overflow-hidden">
                  <div
                    className="absolute inset-0 animate-glare pointer-events-none"
                    style={{
                      background: `linear-gradient(-45deg,
                        transparent 40%,
                        var(--color-glare) 45%,
                        var(--color-glare) 55%,
                        transparent 60%)`,
                      backgroundSize: "200% 200%",
                      backgroundRepeat: "no-repeat",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sorting Section */}
          <div className="space-y-2">
            <div className="h-4 bg-white/10 rounded w-20 mb-2 relative overflow-hidden">
              <div
                className="absolute inset-0 animate-glare pointer-events-none"
                style={{
                  background: `linear-gradient(-45deg,
                    transparent 40%,
                    var(--color-glare) 45%,
                    var(--color-glare) 55%,
                    transparent 60%)`,
                  backgroundSize: "200% 200%",
                  backgroundRepeat: "no-repeat",
                }}
              />
            </div>
            <div>
              <div className="h-3 bg-white/10 rounded w-16 mb-1 relative overflow-hidden">
                <div
                  className="absolute inset-0 animate-glare pointer-events-none"
                  style={{
                    background: `linear-gradient(-45deg,
                      transparent 40%,
                      var(--color-glare) 45%,
                      var(--color-glare) 55%,
                      transparent 60%)`,
                    backgroundSize: "200% 200%",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </div>
              <div className="h-10 bg-white/10 rounded relative overflow-hidden">
                <div
                  className="absolute inset-0 animate-glare pointer-events-none"
                  style={{
                    background: `linear-gradient(-45deg,
                      transparent 40%,
                      var(--color-glare) 45%,
                      var(--color-glare) 55%,
                      transparent 60%)`,
                    backgroundSize: "200% 200%",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* List Info Card */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <div className="h-6 bg-white/15 rounded w-16 mb-4 relative overflow-hidden">
          <div
            className="absolute inset-0 animate-glare pointer-events-none"
            style={{
              background: `linear-gradient(-45deg,
                transparent 40%,
                var(--color-glare) 45%,
                var(--color-glare) 55%,
                transparent 60%)`,
              backgroundSize: "200% 200%",
              backgroundRepeat: "no-repeat",
            }}
          />
        </div>
        <div className="space-y-3 text-sm">
          {/* Owner */}
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 bg-white/10 rounded mt-0.5 shrink-0 relative overflow-hidden">
              <div
                className="absolute inset-0 animate-glare pointer-events-none"
                style={{
                  background: `linear-gradient(-45deg,
                    transparent 40%,
                    var(--color-glare) 45%,
                    var(--color-glare) 55%,
                    transparent 60%)`,
                  backgroundSize: "200% 200%",
                  backgroundRepeat: "no-repeat",
                }}
              />
            </div>
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-white/10 rounded w-12 relative overflow-hidden">
                <div
                  className="absolute inset-0 animate-glare pointer-events-none"
                  style={{
                    background: `linear-gradient(-45deg,
                      transparent 40%,
                      var(--color-glare) 45%,
                      var(--color-glare) 55%,
                      transparent 60%)`,
                    backgroundSize: "200% 200%",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </div>
              <div className="h-4 bg-white/15 rounded w-32 relative overflow-hidden">
                <div
                  className="absolute inset-0 animate-glare pointer-events-none"
                  style={{
                    background: `linear-gradient(-45deg,
                      transparent 40%,
                      var(--color-glare) 45%,
                      var(--color-glare) 55%,
                      transparent 60%)`,
                    backgroundSize: "200% 200%",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Created */}
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 bg-white/10 rounded mt-0.5 shrink-0 relative overflow-hidden">
              <div
                className="absolute inset-0 animate-glare pointer-events-none"
                style={{
                  background: `linear-gradient(-45deg,
                    transparent 40%,
                    var(--color-glare) 45%,
                    var(--color-glare) 55%,
                    transparent 60%)`,
                  backgroundSize: "200% 200%",
                  backgroundRepeat: "no-repeat",
                }}
              />
            </div>
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-white/10 rounded w-16 relative overflow-hidden">
                <div
                  className="absolute inset-0 animate-glare pointer-events-none"
                  style={{
                    background: `linear-gradient(-45deg,
                      transparent 40%,
                      var(--color-glare) 45%,
                      var(--color-glare) 55%,
                      transparent 60%)`,
                    backgroundSize: "200% 200%",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </div>
              <div className="h-4 bg-white/15 rounded w-28 relative overflow-hidden">
                <div
                  className="absolute inset-0 animate-glare pointer-events-none"
                  style={{
                    background: `linear-gradient(-45deg,
                      transparent 40%,
                      var(--color-glare) 45%,
                      var(--color-glare) 55%,
                      transparent 60%)`,
                    backgroundSize: "200% 200%",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
